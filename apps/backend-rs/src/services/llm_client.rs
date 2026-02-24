use std::sync::Arc;
use std::time::Instant;

use reqwest::Client;
use serde_json::{Map, Value};

use crate::config::AppConfig;
use crate::error::{AppError, AppResult};

/// A structured request for the LLM client.
pub struct ChatRequest<'a> {
    pub messages: &'a [Value],
    pub tools: Option<&'a [Value]>,
    pub preferred_model: Option<&'a str>,
    pub temperature: Option<f64>,
    pub timeout_seconds: Option<u64>,
}

/// Response from an LLM call with token tracking and latency.
#[derive(Debug, Clone)]
pub struct ChatResponse {
    pub body: Value,
    pub model_used: String,
    pub fallback_used: bool,
    pub latency_ms: u64,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Central LLM client abstraction with model fallback, token tracking, and latency measurement.
#[derive(Clone)]
pub struct LlmClient {
    http_client: Client,
    config: Arc<AppConfig>,
}

impl LlmClient {
    pub fn new(http_client: Client, config: Arc<AppConfig>) -> Self {
        Self {
            http_client,
            config,
        }
    }

    /// Execute a chat completion request with model fallback chain.
    pub async fn chat_completion(&self, request: ChatRequest<'_>) -> AppResult<ChatResponse> {
        let api_key = self
            .config
            .openai_api_key
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                AppError::ServiceUnavailable(
                    "OPENAI_API_KEY is missing. Configure it in backend environment variables."
                        .to_string(),
                )
            })?;

        let model_chain =
            with_preferred_model(self.config.openai_model_chain(), request.preferred_model);
        if model_chain.is_empty() {
            return Err(AppError::ServiceUnavailable(
                "No OpenAI model is configured.".to_string(),
            ));
        }

        let chat_completions_url = self.config.openai_chat_completions_url();
        let temperature = request.temperature.unwrap_or(0.1);
        let timeout_secs = request
            .timeout_seconds
            .unwrap_or(self.config.ai_agent_timeout_seconds);

        let mut last_error: Option<AppError> = None;
        let mut fallback_used = false;

        for (index, model_name) in model_chain.iter().enumerate() {
            let mut payload = Map::new();
            payload.insert("model".to_string(), Value::String(model_name.to_string()));
            payload.insert(
                "messages".to_string(),
                Value::Array(request.messages.to_vec()),
            );
            payload.insert("temperature".to_string(), Value::from(temperature));
            if let Some(tools) = request.tools {
                payload.insert("tools".to_string(), Value::Array(tools.to_vec()));
                payload.insert("tool_choice".to_string(), Value::String("auto".to_string()));
            }

            let start = Instant::now();

            let response = match self
                .http_client
                .post(&chat_completions_url)
                .header("Authorization", format!("Bearer {api_key}"))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(std::time::Duration::from_secs(timeout_secs))
                .json(&payload)
                .send()
                .await
            {
                Ok(value) => value,
                Err(error) => {
                    tracing::error!(error = %error, model = %model_name, "AI provider is unreachable");
                    last_error = Some(AppError::Dependency(
                        "AI provider is unreachable.".to_string(),
                    ));
                    if index < model_chain.len() - 1 {
                        fallback_used = true;
                        continue;
                    }
                    return Err(last_error.take().unwrap_or_else(|| {
                        AppError::Dependency("AI provider is unreachable.".to_string())
                    }));
                }
            };

            let latency_ms = start.elapsed().as_millis() as u64;
            let status = response.status();
            let body_text = response.text().await.unwrap_or_default();

            if !status.is_success() {
                let detail = if self.config.is_production() {
                    "AI provider request failed.".to_string()
                } else {
                    let error_body = body_text.trim();
                    let reason = if error_body.is_empty() {
                        status.canonical_reason().unwrap_or("unknown")
                    } else {
                        error_body
                    };
                    format!(
                        "AI provider request failed ({}) on model '{}': {}",
                        status.as_u16(),
                        model_name,
                        reason
                    )
                };
                last_error = Some(AppError::Dependency(detail));
                if index < model_chain.len() - 1 {
                    fallback_used = true;
                    continue;
                }
                return Err(last_error.take().unwrap_or_else(|| {
                    AppError::Dependency("AI provider request failed.".to_string())
                }));
            }

            let parsed: Value = match serde_json::from_str(&body_text) {
                Ok(value) => value,
                Err(_) => {
                    last_error = Some(AppError::Dependency(
                        "AI provider returned an invalid JSON response.".to_string(),
                    ));
                    if index < model_chain.len() - 1 {
                        fallback_used = true;
                        continue;
                    }
                    return Err(last_error.take().unwrap_or_else(|| {
                        AppError::Dependency(
                            "AI provider returned an invalid JSON response.".to_string(),
                        )
                    }));
                }
            };

            if !parsed.is_object() {
                last_error = Some(AppError::Dependency(
                    "AI provider response is malformed.".to_string(),
                ));
                if index < model_chain.len() - 1 {
                    fallback_used = true;
                    continue;
                }
                return Err(last_error.take().unwrap_or_else(|| {
                    AppError::Dependency("AI provider response is malformed.".to_string())
                }));
            }

            // Parse usage tokens from response
            let usage = parsed.get("usage");
            let prompt_tokens = usage
                .and_then(|u| u.get("prompt_tokens"))
                .and_then(Value::as_u64)
                .unwrap_or(0) as u32;
            let completion_tokens = usage
                .and_then(|u| u.get("completion_tokens"))
                .and_then(Value::as_u64)
                .unwrap_or(0) as u32;
            let total_tokens = usage
                .and_then(|u| u.get("total_tokens"))
                .and_then(Value::as_u64)
                .unwrap_or(0) as u32;

            return Ok(ChatResponse {
                body: parsed,
                model_used: model_name.to_string(),
                fallback_used: fallback_used || index > 0,
                latency_ms,
                prompt_tokens,
                completion_tokens,
                total_tokens,
            });
        }

        Err(last_error
            .unwrap_or_else(|| AppError::Dependency("AI provider request failed.".to_string())))
    }
}

fn with_preferred_model(model_chain: Vec<String>, preferred_model: Option<&str>) -> Vec<String> {
    let preferred = preferred_model
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or_default();
    if preferred.is_empty() {
        return model_chain;
    }

    if !model_chain.iter().any(|model| model == preferred) {
        return model_chain;
    }

    let mut next = Vec::with_capacity(model_chain.len());
    next.push(preferred.to_string());
    for model in model_chain {
        if model != preferred {
            next.push(model);
        }
    }
    next
}
