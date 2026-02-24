# How to Make Casaora the First True AI Agentic Property Management SaaS

You already have an exceptionally strong foundation. After a deep dive into the codebase, here is an honest assessment of what you have, what's partially built, and what concrete improvements will get you over the finish line.

---

## 🏗️ What You Already Have (Your Moat)

Your foundation is genuinely ahead of the market:

**Multi-Agent Runtime:** You have 5 specialized agents registered — `supervisor`, `guest-concierge`, `maintenance-triage`, `finance-agent`, and `leasing-agent` — all wired into a shared tool registry of 79+ tools. [0-cite-0](#0-cite-0) 

**Approval-First Safety:** A configurable, three-tier autonomy model (`copilot` → `collaborator` → `autonomous`) is already in place, derived dynamically from approval policies. [0-cite-1](#0-cite-1) 

**Full ReAct Loop with Streaming:** The backend runs a full tool-call loop with SSE streaming, auto-evaluation, and memory extraction after every interaction. [0-cite-2](#0-cite-2) 

**Auto-Evaluation:** Every agent response is automatically scored on accuracy, helpfulness, and safety via an LLM rubric — this is table-stakes for a production AI product. [0-cite-3](#0-cite-3) 

**Dynamic Pricing with Seasonality:** The finance agent already runs multi-factor pricing recommendations (demand, seasonal, competitor, day-of-week, last-minute) with auto-apply for small deltas. [0-cite-4](#0-cite-4) 

**Voice Agent (Twilio + Whisper + ElevenLabs):** Inbound voice calls are transcribed, intent-classified, and routed to specialist agents — in Spanish. [0-cite-5](#0-cite-5) 

**IoT-Triggered Agent Workflows:** Sensor events auto-create maintenance tickets (water leak, smoke, temperature) and can revoke/issue smart-lock access codes. [0-cite-6](#0-cite-6) 

**Durable Workflow Engine:** A queue-mode workflow engine with row-level locking, retry backoff, and deduplication keys powers multi-step async operations. [0-cite-7](#0-cite-7) 

**MCP Server:** Casaora exposes its full tool API as an MCP server, meaning agents can be used natively inside Claude Desktop and other MCP clients — a massive distribution advantage. [0-cite-8](#0-cite-8) 

**Stripe + Mercado Pago Payments:** Both a global and a local LATAM payment processor are integrated. [0-cite-9](#0-cite-9) 

**Vision AI Inspections:** The maintenance triage agent can analyze before/after inspection photos via OpenAI Vision. [0-cite-10](#0-cite-10) 

**Scenario Simulation:** Agents can run renovation ROI and market stress-test simulations for owners. [0-cite-11](#0-cite-11) 

---

## 🚀 Prioritized Improvements to Win the Market

### Priority 1 — Harden the Agentic Core (Immediate)

**1a. Fix the In-Memory Rate Limiter**
The current rate limiter uses a `Mutex<HashMap>` — it resets on every restart and doesn't work across multiple backend instances. Replace it with a Redis or DB-backed rate limiter before going to production with real clients. [0-cite-12](#0-cite-12) 

**1b. Upgrade the `needs_approval` List**
The approval-gating in the tool execution endpoint only hard-codes 10 tools as mutation-requiring. Given your 79+ tools, many mutations (e.g., `auto_assign_maintenance`, `apply_pricing_recommendation`, `dispatch_to_vendor`) go through without policy checks unless explicitly configured. Systematically review and expand this list. [0-cite-13](#0-cite-13) 

**1c. Parallel Multi-Agent Execution**
The `supervisor` agent currently handles cross-domain requests sequentially. Upgrading it to support parallel `tokio::spawn` fan-out for multi-domain tasks (e.g., simultaneously running `maintenance-triage` + `finance-agent`) would dramatically reduce latency. [0-cite-14](#0-cite-14) 

**1d. Expand Agent Decision Rules with Guardrails**
The `maintenance-triage` and `finance-agent` have powerful decision rules in their system prompts. Encode the most critical ones (e.g., vendor scoring formula, SLA breach logic, Paraguay IVA enforcement) as validated Rust-side guardrails, not just LLM-prompt instructions. [0-cite-15](#0-cite-15) [0-cite-16](#0-cite-16) 

---

### Priority 2 — Build the Full Guest Communication Loop (Biggest Revenue Driver)

**2a. Close the WhatsApp Auto-Send Loop**
The `generate_ai_reply` service computes confidence and routes to approval, but the actual WhatsApp send dispatch needs a production-grade background worker consuming the `message_logs` queue. This is explicitly called out as missing. [0-cite-17](#0-cite-17) [0-cite-18](#0-cite-18) 

**2b. Grow the RAG Knowledge Base**
The guest concierge's #1 rule is "KNOWLEDGE FIRST — search_knowledge before answering anything." The quality of the RAG knowledge base directly determines the auto-send rate. Build a UI that makes it dead simple for property managers to upload house manuals, FAQs, and procedures. [0-cite-19](#0-cite-19) 

---

### Priority 3 — Complete the Self-Service Portals (Table Stakes)

The portal routes already exist in the backend: [0-cite-20](#0-cite-20) [0-cite-21](#0-cite-21) [0-cite-22](#0-cite-22) 

The missing piece is **production-ready frontend flows** for each of these portals (self-service booking, maintenance request submission, owner report access). Without these, the agents have no inbound surface area beyond the chat UI.

---

### Priority 4 — Monetize with Feature Gating (SaaS Billing)

The subscription plan routes and usage metering infrastructure already exist: [0-cite-23](#0-cite-23) 

The `metering.record_usage_event` call is even wired into every tool execution: [0-cite-24](#0-cite-24) 

The missing piece is **feature gating** — using the `plan_limits` service to actually block agents, tools, or number of units per tier. Without this, you can't charge.

---

### Priority 5 — No-Code Agent & Workflow Builder (Platform Moat)

The workflow engine supports `invoke_agent` and `run_agent_playbook` as first-class action types: [0-cite-25](#0-cite-25) 

The agent playbook runner is already built: [0-cite-26](#0-cite-26) 

Building a visual, no-code UI on top of your `workflow_rules` table — where property managers can create triggers like "when reservation is confirmed → run leasing-agent playbook 'send_welcome'" — would make Casaora the only PMS where non-technical operators can configure AI behavior themselves. [0-cite-27](#0-cite-27) 

---

### Priority 6 — ML Predictions Pipeline

The database already has `ml_predictions` and `demand_forecasts` tables in the supported table list: [0-cite-28](#0-cite-28) 

The pricing engine currently uses a hardcoded elasticity model (`-0.8`). Replacing this with a real ML pipeline trained on your historical reservation data would make the `finance-agent` recommendations significantly more accurate and defensible. [0-cite-29](#0-cite-29) 

---

### Priority 7 — Two-Way OTA API Sync

Currently, channel integrations support iCal import/export. Upgrading to the **Airbnb and Booking.com direct APIs** would enable real-time availability/pricing updates pushed automatically by the dynamic pricing agent — turning the pricing loop from manual-review to fully autonomous. [0-cite-30](#0-cite-30) [0-cite-31](#0-cite-31) 

---

## 🗺️ Strategic Architecture Map

```mermaid
graph TD
    "Guest / WhatsApp" --> "AI Guest Reply Service"
    "AI Guest Reply Service" --> "Guest Concierge Agent"
    "Guest Concierge Agent" --> "RAG Knowledge Base"
    "Guest Concierge Agent" --> "Approval Engine"
    "Approval Engine" -->|"confidence >= 0.8"| "Auto-Send WhatsApp"
    "Approval Engine" -->|"confidence < 0.8"| "Admin Inbox"

    "IoT Sensor Event" --> "Maintenance Triage Agent"
    "Maintenance Triage Agent" --> "Vendor Dispatch"
    "Maintenance Triage Agent" --> "Vision AI Inspection"

    "Scheduler (06:00 UTC)" --> "Finance Agent"
    "Finance Agent" --> "Dynamic Pricing Engine"
    "Dynamic Pricing Engine" -->|"delta < 10%"| "Auto-Apply"
    "Dynamic Pricing Engine" -->|"delta >= 10%"| "Human Review"

    "Supervisor Agent" --> "Guest Concierge Agent"
    "Supervisor Agent" --> "Maintenance Triage Agent"
    "Supervisor Agent" --> "Finance Agent"
    "Supervisor Agent" --> "Leasing Agent"

    "No-Code Workflow Builder" --> "Workflow Engine"
    "Workflow Engine" --> "invoke_agent"
    "Workflow Engine" --> "run_agent_playbook"
```

---

## Notes

- Your **biggest immediate risk** is not missing features — it's the in-memory rate limiter and the hardcoded approval tool list. These will cause production failures and security gaps at scale. Fix these first.
- Your **biggest revenue unlock** is closing the WhatsApp auto-send loop and growing the RAG knowledge base — these directly drive the "70-80% of work automated" promise.
- Your **moat vs. competitors** (Guesty, Hostaway, etc.) is the combination of the **MCP server** + **no-code workflow builder** + **approval-first autonomy** — no incumbent has all three. This is your story.
- The `plan.md` in your repo already contains an excellent self-assessment that aligns with this analysis. [0-cite-32](#0-cite-32)

### Citations

**File:** apps/admin/lib/agents/index.ts (L24-30)
```typescript
export const agentRegistry: Record<string, AgentConfig> = {
  "guest-concierge": guestConcierge,
  "maintenance-triage": maintenanceTriage,
  "finance-agent": financeAgent,
  "leasing-agent": leasingAgent,
  supervisor,
};
```

**File:** apps/admin/lib/agents/autonomy-level.ts (L1-27)
```typescript
export type AutonomyLevel = "copilot" | "collaborator" | "autonomous";

/**
 * Derives the current autonomy level from approval policies.
 *
 * - Copilot: all mutation tools require approval
 * - Autonomous: most tools are auto-approved
 * - Collaborator: mixed (some require approval, some don't)
 */
export function deriveAutonomyLevel(
  policies: Array<{ tool_name: string; approval_mode: string; enabled: boolean }>
): AutonomyLevel {
  const activePolicies = policies.filter((p) => p.enabled);

  if (activePolicies.length === 0) return "autonomous";

  const requiredCount = activePolicies.filter(
    (p) => p.approval_mode === "required"
  ).length;
  const autoCount = activePolicies.filter(
    (p) => p.approval_mode === "auto"
  ).length;

  if (requiredCount === activePolicies.length) return "copilot";
  if (autoCount === activePolicies.length) return "autonomous";
  return "collaborator";
}
```

**File:** apps/backend-rs/src/services/ai_agent.rs (L14-17)
```rust
/// In-memory rate limiter: tracks (agent_slug, hour) → call count.
/// Resets each hour. Max 100 tool calls per agent per hour.
static TOOL_RATE_LIMITER: std::sync::LazyLock<Mutex<HashMap<(String, u64), u32>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));
```

**File:** apps/backend-rs/src/services/ai_agent.rs (L170-180)
```rust
        "iot_events",
        "access_codes",
        "ml_predictions",
        "demand_forecasts",
        "agent_playbooks",
        "agent_health_metrics",
        "pii_intercept_log",
        "agent_boundary_rules",
    ]
    .into_iter()
    .map(ToOwned::to_owned)
```

**File:** apps/backend-rs/src/services/ai_agent.rs (L514-590)
```rust
pub async fn run_ai_agent_chat_streaming(
    state: &AppState,
    params: RunAiAgentChatParams<'_>,
    tx: tokio::sync::mpsc::Sender<AgentStreamEvent>,
) -> AppResult<Map<String, Value>> {
    if !state.config.ai_agent_enabled {
        let message = AI_AGENT_DISABLED_MESSAGE.to_string();
        let _ = tx
            .send(AgentStreamEvent::Error {
                message: message.clone(),
            })
            .await;
        let _ = tx
            .send(AgentStreamEvent::Done {
                content: message.clone(),
                tool_trace: Vec::new(),
                model_used: None,
                fallback_used: false,
                structured_content: None,
                explanation: None,
            })
            .await;

        return Ok(disabled_stream_payload());
    }

    let role_value = normalize_role(params.role);
    let base_prompt = params
        .agent_prompt
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| {
            format!(
                "You are {} for Casaora, a property-management platform in Paraguay.",
                params.agent_name
            )
        });

    let system_prompt = format!(
        "{base_prompt} Use tools for all data-backed answers. Keep replies concise and action-oriented. Current org_id is {}. Current user role is {}. Never access data outside this organization. When a user asks to create/update/delete data, call the matching tool. If a write tool returns an error, explain why and propose a safe next action.",
        params.org_id,
        role_value,
    );

    let mut messages = vec![json!({"role": "system", "content": system_prompt})];
    let context_start = params.conversation.len().saturating_sub(24);
    for item in &params.conversation[context_start..] {
        let role_name = item.role.trim().to_ascii_lowercase();
        let content = item.content.trim();
        if matches!(role_name.as_str(), "user" | "assistant") && !content.is_empty() {
            messages.push(json!({
                "role": role_name,
                "content": truncate_chars(content, 4000),
            }));
        }
    }
    messages.push(json!({
        "role": "user",
        "content": truncate_chars(params.message.trim(), 4000),
    }));

    let mut tool_trace: Vec<Value> = Vec::new();
    let mut fallback_used = false;
    let mut model_used = String::new();
    let planning_mode = false;
    let mut token_usage = RunTokenUsage::default();
    let tool_definitions = tool_definitions(params.allowed_tools);

    let _ = tx
        .send(AgentStreamEvent::Status {
            message: "Thinking...".to_string(),
        })
        .await;

    let max_steps = std::cmp::max(1, state.config.ai_agent_max_tool_steps);
    let effective_max = if planning_mode { max_steps.max(12) } else { max_steps };
```

**File:** apps/backend-rs/src/services/ai_agent.rs (L914-1000)
```rust
/// Fire-and-forget auto-evaluation: score the agent's response via LLM rubric.
fn spawn_auto_evaluation(
    state: AppState,
    org_id: String,
    agent_slug: String,
    reply: String,
    tool_trace: Vec<Value>,
) {
    tokio::spawn(async move {
        let pool = match state.db_pool.as_ref() {
            Some(p) => p,
            None => return,
        };

        // Build eval prompt
        let eval_prompt = format!(
            "Rate the following AI agent response on three dimensions (1-5 scale):\n\n\
             RESPONSE:\n{}\n\n\
             TOOL CALLS: {}\n\n\
             Score each dimension:\n\
             - accuracy: Does the response contain factual, verifiable information?\n\
             - helpfulness: Does it address the user's request effectively?\n\
             - safety: Does it avoid harmful content, protect PII, and stay within scope?\n\n\
             Reply with ONLY a JSON object: {{\"accuracy\": N, \"helpfulness\": N, \"safety\": N}}",
            truncate_chars(&reply, 2000),
            tool_trace.len(),
        );

        let messages = vec![
            json!({"role": "system", "content": "You are an AI evaluation judge. Score agent responses objectively."}),
            json!({"role": "user", "content": eval_prompt}),
        ];

        let eval_result = state
            .llm_client
            .chat_completion(crate::services::llm_client::ChatRequest {
                messages: &messages,
                tools: None,
                preferred_model: None,
                temperature: Some(0.0),
                timeout_seconds: Some(15),
            })
            .await;

        let (accuracy, helpfulness, safety) = match eval_result {
            Ok(resp) => {
                let text = resp
                    .body
                    .get("choices")
                    .and_then(Value::as_array)
                    .and_then(|c| c.first())
                    .and_then(Value::as_object)
                    .and_then(|c| c.get("message"))
                    .and_then(Value::as_object)
                    .and_then(|m| m.get("content"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();

                // Try to parse JSON scores from response
                let parsed: Option<Value> = serde_json::from_str(
                    text.trim()
                        .trim_start_matches("```json")
                        .trim_start_matches("```")
                        .trim_end_matches("```")
                        .trim(),
                )
                .ok();

                let acc = parsed
                    .as_ref()
                    .and_then(|v| v.get("accuracy"))
                    .and_then(Value::as_f64)
                    .unwrap_or(3.0)
                    / 5.0;
                let help = parsed
                    .as_ref()
                    .and_then(|v| v.get("helpfulness"))
                    .and_then(Value::as_f64)
                    .unwrap_or(3.0)
                    / 5.0;
                let safe = parsed
                    .as_ref()
                    .and_then(|v| v.get("safety"))
                    .and_then(Value::as_f64)
                    .unwrap_or(4.0)
                    / 5.0;
                (acc, help, safe)
```

**File:** apps/backend-rs/src/services/dynamic_pricing.rs (L598-607)
```rust

    // Price elasticity model: -0.8 elasticity (10% price increase → 8% occupancy decrease)
    let elasticity = -0.8;
    let rate_change_pct = if current_rate > 0.0 {
        (proposed_rate - current_rate) / current_rate
    } else {
        0.0
    };
    let occupancy_change = rate_change_pct * elasticity;
    let projected_occupancy = (hist_occupancy + occupancy_change).clamp(0.05, 0.98);
```

**File:** apps/backend-rs/src/services/dynamic_pricing.rs (L651-697)
```rust
/// Daily pricing recommendations job — generates recommendations for all active orgs.
/// Called by the scheduler at 06:00 UTC.
pub async fn run_daily_pricing_recommendations(state: &AppState) {
    let pool = match state.db_pool.as_ref() {
        Some(p) => p,
        None => return,
    };

    let org_ids: Vec<(String,)> = sqlx::query_as(
        "SELECT id::text FROM organizations WHERE is_active = true LIMIT 100",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut total = 0u32;
    for (org_id,) in &org_ids {
        let args = Map::new(); // default period_days = 30
        match tool_generate_pricing_recommendations(state, org_id, &args).await {
            Ok(result) => {
                let count = result.get("count").and_then(Value::as_u64).unwrap_or(0);
                total += count as u32;
            }
            Err(e) => {
                tracing::warn!(org_id, error = %e, "Daily pricing: failed for org");
            }
        }
    }

    // Auto-approve pricing changes with < 10% delta (skip approval queue)
    let mut auto_applied = 0u32;
    for (org_id,) in &org_ids {
        match auto_approve_small_pricing_changes(pool, org_id).await {
            Ok(count) => auto_applied += count,
            Err(e) => {
                tracing::warn!(org_id, error = %e, "Daily pricing: auto-approve failed");
            }
        }
    }

    tracing::info!(
        total_recommendations = total,
        auto_applied,
        org_count = org_ids.len(),
        "Daily pricing recommendations completed"
    );
}
```

**File:** apps/backend-rs/src/services/voice_agent.rs (L10-87)
```rust
/// This is called from the Twilio webhook route when an incoming call is received.
pub async fn handle_voice_interaction(
    state: &AppState,
    org_id: &str,
    caller_phone: &str,
    audio_url: Option<&str>,
) -> AppResult<Value> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        AppError::Dependency("Database is not configured.".to_string())
    })?;

    // 1. Look up caller in guest/tenant records
    let caller_info: Option<(String, String)> = sqlx::query_as(
        "SELECT id::text, full_name FROM guests
         WHERE organization_id = $1::uuid AND phone = $2
         LIMIT 1",
    )
    .bind(org_id)
    .bind(caller_phone)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let (guest_id, caller_name) = caller_info.unwrap_or_default();

    // 2. If audio provided, transcribe with Whisper
    let transcript = if let Some(url) = audio_url {
        transcribe_audio(state, url).await.unwrap_or_default()
    } else {
        String::new()
    };

    // 3. Route to appropriate agent based on transcript content
    let agent_slug = classify_voice_intent(&transcript);

    // 4. Log the voice interaction
    let mut msg = serde_json::Map::new();
    msg.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    msg.insert("channel".to_string(), Value::String("voice".to_string()));
    msg.insert(
        "recipient".to_string(),
        Value::String(caller_phone.to_string()),
    );
    msg.insert(
        "direction".to_string(),
        Value::String("inbound".to_string()),
    );
    msg.insert("status".to_string(), Value::String("received".to_string()));
    let mut payload = serde_json::Map::new();
    payload.insert("body".to_string(), Value::String(transcript.clone()));
    payload.insert(
        "guest_id".to_string(),
        Value::String(guest_id.clone()),
    );
    payload.insert(
        "caller_name".to_string(),
        Value::String(caller_name.clone()),
    );
    payload.insert(
        "routed_to_agent".to_string(),
        Value::String(agent_slug.to_string()),
    );
    msg.insert("payload".to_string(), Value::Object(payload));
    let _ = crate::repository::table_service::create_row(pool, "message_logs", &msg).await;

    Ok(json!({
        "ok": true,
        "caller_phone": caller_phone,
        "caller_name": caller_name,
        "guest_id": guest_id,
        "transcript": transcript,
        "routed_to_agent": agent_slug,
    }))
}
```

**File:** apps/backend-rs/src/services/iot.rs (L197-300)
```rust
/// Process a sensor event: store and trigger alerts if thresholds exceeded.
pub async fn tool_process_sensor_event(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let device_id = args.get("device_id").and_then(Value::as_str).unwrap_or_default();
    let event_type = args.get("event_type").and_then(Value::as_str).unwrap_or("reading");
    let value = args.get("value").and_then(Value::as_f64);
    let unit_of_measure = args.get("unit_of_measure").and_then(Value::as_str).unwrap_or_default();
    let description = args.get("description").and_then(Value::as_str).unwrap_or_default();

    if device_id.is_empty() {
        return Ok(json!({ "ok": false, "error": "device_id is required." }));
    }

    // Determine severity based on thresholds
    let severity = if let Some(val) = value {
        match unit_of_measure {
            "%" if val > 80.0 => "warning",   // humidity > 80%
            "°C" if val > 35.0 => "warning",  // temperature > 35°C
            "°C" if val < 5.0 => "critical",  // freezing
            _ if event_type == "alert" => "warning",
            _ => "info",
        }
    } else if event_type == "alert" || event_type == "offline" {
        "warning"
    } else {
        "info"
    };

    let result = sqlx::query(
        "INSERT INTO iot_events
            (organization_id, device_id, event_type, severity, value, unit_of_measure, description)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
         RETURNING id::text",
    )
    .bind(org_id)
    .bind(device_id)
    .bind(event_type)
    .bind(severity)
    .bind(value)
    .bind(unit_of_measure)
    .bind(description)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to log IoT event");
        AppError::Dependency("Failed to log IoT event.".to_string())
    })?;

    // Update device last_seen_at
    let _ = sqlx::query(
        "UPDATE iot_devices SET last_seen_at = now() WHERE id = $1::uuid",
    )
    .bind(device_id)
    .execute(pool)
    .await;

    // If critical/warning, auto-create maintenance ticket for water leak or smoke
    let mut ticket_created = false;
    if severity != "info" && (unit_of_measure == "%" || event_type == "alert") {
        let device = sqlx::query(
            "SELECT device_type, unit_id::text, device_name
             FROM iot_devices WHERE id = $1::uuid",
        )
        .bind(device_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

        if let Some(dev) = device {
            let dev_type = dev.try_get::<String, _>("device_type").unwrap_or_default();
            let dev_unit = dev.try_get::<Option<String>, _>("unit_id").ok().flatten();
            let dev_name = dev.try_get::<String, _>("device_name").unwrap_or_default();

            if dev_type == "water_leak" || dev_type == "smoke" || severity == "critical" {
                let title = format!("IoT Alert: {} - {}", dev_name, description);
                let _ = sqlx::query(
                    "INSERT INTO maintenance_requests
                        (organization_id, title, description, status, source, unit_id, ai_urgency)
                     VALUES ($1::uuid, $2, $3, 'open', 'iot_sensor', $4::uuid, 'high')",
                )
                .bind(org_id)
                .bind(&title)
                .bind(description)
                .bind(dev_unit.as_deref())
                .execute(pool)
                .await;
                ticket_created = true;
            }
        }
    }

    Ok(json!({
        "ok": true,
        "event_id": result.try_get::<String, _>("id").unwrap_or_default(),
        "severity": severity,
        "ticket_created": ticket_created,
    }))
}
```

**File:** apps/backend-rs/src/services/workflows.rs (L60-185)
```rust
pub async fn fire_trigger(
    pool: &sqlx::PgPool,
    org_id: &str,
    trigger_event: &str,
    context: &Map<String, Value>,
    engine_mode: WorkflowEngineMode,
) {
    let queue_mode = engine_mode == WorkflowEngineMode::Queue && queue_enabled_for_org(org_id);

    let mut filters = Map::new();
    filters.insert(
        "organization_id".to_string(),
        Value::String(org_id.to_string()),
    );
    filters.insert("is_active".to_string(), Value::Bool(true));
    filters.insert(
        "trigger_event".to_string(),
        Value::String(trigger_event.to_string()),
    );

    let rules = match list_rows(
        pool,
        "workflow_rules",
        Some(&filters),
        200,
        0,
        "created_at",
        true,
    )
    .await
    {
        Ok(rows) => rows,
        Err(error) => {
            warn!(?error, "workflow fire_trigger: could not load rules");
            return;
        }
    };

    for rule in rules {
        let rule_id = val_str(&rule, "id");
        let action_type = val_str(&rule, "action_type");
        let action_config = rule
            .as_object()
            .and_then(|obj| obj.get("action_config"))
            .cloned()
            .unwrap_or_else(|| json!({}));

        let delay_minutes = rule
            .as_object()
            .and_then(|obj| obj.get("delay_minutes"))
            .and_then(Value::as_i64)
            .unwrap_or(0)
            .max(0);

        let normalized_config = normalize_action_config(&action_type, &action_config);

        if queue_mode {
            if rule_id.is_empty() {
                warn!(
                    trigger_event,
                    "workflow fire_trigger: skipping rule without id"
                );
                continue;
            }
            let run_at = Utc::now() + Duration::minutes(delay_minutes);
            if let Err(error) = enqueue_workflow_job(
                pool,
                EnqueueWorkflowJobInput {
                    org_id,
                    rule_id: &rule_id,
                    trigger_event,
                    action_type: &action_type,
                    action_config: &normalized_config,
                    context,
                    run_at,
                },
            )
            .await
            {
                warn!(?error, rule_id, trigger_event, "workflow enqueue failed");
            }
            continue;
        }

        if delay_minutes > 0 {
            let pool = pool.clone();
            let org_id = org_id.to_string();
            let rule_id = rule_id.clone();
            let action_type = action_type.clone();
            let normalized_config = normalized_config.clone();
            let context = context.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(
                    (delay_minutes as u64).saturating_mul(60),
                ))
                .await;
                if let Err(error) = execute_action(
                    &pool,
                    &org_id,
                    Some(rule_id.as_str()),
                    &action_type,
                    &normalized_config,
                    &context,
                )
                .await
                {
                    warn!(?error, "workflow legacy delayed action failed");
                }
            });
            continue;
        }

        if let Err(error) = execute_action(
            pool,
            org_id,
            Some(rule_id.as_str()),
            &action_type,
            &normalized_config,
            context,
        )
        .await
        {
            warn!(?error, "workflow legacy action failed");
        }
    }
}
```

**File:** apps/backend-rs/src/services/workflows.rs (L562-573)
```rust
        "run_agent_playbook" => {
            execute_run_agent_playbook(pool, org_id, action_config, context).await
        }
        "request_agent_approval" => {
            execute_request_agent_approval(pool, org_id, action_config, context).await
        }
        "invoke_agent" => execute_invoke_agent(pool, org_id, action_config, context).await,
        other => Ok(ExecutionOutcome::Skipped(format!(
            "unsupported action_type '{other}'"
        ))),
    }
}
```

**File:** AGENTS.md (L243-248)
```markdown
## MCP Server

The `packages/mcp-server/` package exposes the Casaora tool API as an MCP server for use with Claude Desktop and other MCP clients.

**Setup**: Configure in `.mcp.json` with `CASAORA_API_BASE_URL`, `CASAORA_API_TOKEN`, and `CASAORA_ORG_ID`.

```

**File:** apps/backend-rs/src/services/payments.rs (L11-60)
```rust
pub async fn create_stripe_checkout_session(
    http_client: &Client,
    config: &AppConfig,
    amount: f64,
    currency: &str,
    reference_code: &str,
    tenant_name: &str,
    org_name: &str,
) -> Result<Value, String> {
    let secret_key = config
        .stripe_secret_key
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "STRIPE_SECRET_KEY not configured".to_string())?;

    let amount_cents = (amount * 100.0).round() as i64;
    let currency_lower = currency.to_lowercase();

    // Stripe expects PYG amounts without decimal places (zero-decimal currency)
    let stripe_amount = if currency_lower == "pyg" {
        amount.round() as i64
    } else {
        amount_cents
    };

    let success_url = format!(
        "{}/pay/{}?status=success",
        config.app_public_url, reference_code
    );
    let cancel_url = format!(
        "{}/pay/{}?status=cancelled",
        config.app_public_url, reference_code
    );

    let description = if tenant_name.is_empty() {
        format!("Payment {reference_code} — {org_name}")
    } else {
        format!("Payment {reference_code} — {tenant_name} — {org_name}")
    };

    let response = http_client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .basic_auth(secret_key, None::<&str>)
        .form(&[
            ("mode", "payment"),
            ("payment_method_types[]", "card"),
            ("line_items[0][price_data][currency]", &currency_lower),
            (
                "line_items[0][price_data][unit_amount]",
                &stripe_amount.to_string(),
```

**File:** apps/backend-rs/src/services/vision_ai.rs (L16-70)
```rust
pub async fn tool_analyze_inspection_photos(
    state: &AppState,
    org_id: &str,
    args: &Map<String, Value>,
) -> AppResult<Value> {
    let pool = db_pool(state)?;

    let unit_id = args
        .get("unit_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let photo_urls = args
        .get("photo_urls")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let inspection_type = args
        .get("inspection_type")
        .and_then(Value::as_str)
        .unwrap_or("routine");

    if unit_id.is_empty() || photo_urls.is_empty() {
        return Ok(json!({
            "ok": false,
            "error": "unit_id and photo_urls are required.",
        }));
    }

    let api_key = state
        .config
        .openai_api_key
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| {
            AppError::ServiceUnavailable("OPENAI_API_KEY is required for vision analysis.".to_string())
        })?;

    // Build vision API request with photo URLs
    let mut content_parts: Vec<Value> = vec![json!({
        "type": "text",
        "text": format!(
            "You are a property inspection assistant. Analyze these photos from a {} inspection of a rental unit. \
             For each room/area visible, provide:\n\
             1. Room identification\n\
             2. Condition score (1-5, where 5 is excellent)\n\
             3. Any defects or damage found\n\
             4. Maintenance recommendations\n\n\
             Return a JSON object with: overall_score (1-5), rooms (array of {{room, score, defects[], recommendations[]}}), \
             summary (text), urgent_issues (array of strings).",
            inspection_type
        )
    })];

    for url in &photo_urls {
```

**File:** apps/backend-rs/src/services/scenario_simulation.rs (L6-51)
```rust
pub fn tool_simulate_renovation_roi(args: &Map<String, Value>) -> AppResult<Value> {
    let renovation_cost = args.get("renovation_cost").and_then(Value::as_f64).unwrap_or(0.0);
    let current_monthly_rent = args.get("current_monthly_rent").and_then(Value::as_f64).unwrap_or(0.0);
    let projected_monthly_rent = args.get("projected_monthly_rent").and_then(Value::as_f64).unwrap_or(0.0);
    let vacancy_months = args.get("vacancy_months_during_renovation").and_then(Value::as_f64).unwrap_or(1.0);
    let projection_years = args.get("projection_years").and_then(Value::as_i64).unwrap_or(5).clamp(1, 20) as usize;

    if renovation_cost <= 0.0 || current_monthly_rent <= 0.0 {
        return Ok(json!({ "ok": false, "error": "renovation_cost and current_monthly_rent must be positive." }));
    }

    let monthly_increase = projected_monthly_rent - current_monthly_rent;
    let lost_revenue = current_monthly_rent * vacancy_months;
    let total_cost = renovation_cost + lost_revenue;

    let payback_months = if monthly_increase > 0.0 {
        (total_cost / monthly_increase).ceil() as i64
    } else { 0 };

    let mut yearly: Vec<Value> = Vec::new();
    let mut cumulative_gain = -total_cost;
    for year in 1..=projection_years {
        let annual_gain = monthly_increase * 12.0;
        cumulative_gain += annual_gain;
        yearly.push(json!({
            "year": year,
            "annual_rent_increase": (annual_gain * 100.0).round() / 100.0,
            "cumulative_net_gain": (cumulative_gain * 100.0).round() / 100.0,
        }));
    }

    let roi_pct = if total_cost > 0.0 {
        ((monthly_increase * 12.0 * projection_years as f64 - total_cost) / total_cost * 100.0 * 100.0).round() / 100.0
    } else { 0.0 };

    Ok(json!({
        "ok": true,
        "renovation_cost": renovation_cost,
        "vacancy_lost_revenue": (lost_revenue * 100.0).round() / 100.0,
        "total_cost": (total_cost * 100.0).round() / 100.0,
        "monthly_rent_increase": (monthly_increase * 100.0).round() / 100.0,
        "payback_months": payback_months,
        "roi_pct": roi_pct,
        "projection_years": projection_years,
        "yearly_projections": yearly,
    }))
```

**File:** apps/backend-rs/src/routes/agent_tools.rs (L97-110)
```rust
            let needs_approval = matches!(name, "create_row" | "update_row" | "delete_row"
                | "send_message" | "apply_pricing_recommendation"
                | "advance_application_stage" | "escalate_maintenance"
                | "auto_assign_maintenance" | "select_vendor"
                | "abstract_lease_document");

            Some(serde_json::json!({
                "name": name,
                "description": description,
                "parameters": parameters,
                "needsApproval": needs_approval,
            }))
        })
        .collect();
```

**File:** apps/backend-rs/src/routes/agent_tools.rs (L198-203)
```rust
    // Record usage event
    if let Some(pool) = state.db_pool.as_ref() {
        crate::services::metering::record_usage_event(pool, &payload.org_id, "tool_execution", 1)
            .await;
    }

```

**File:** apps/admin/lib/agents/supervisor.ts (L17-22)
```typescript
Decision rules:
- Always attempt to classify before delegating.
- If a request touches 2+ domains, handle each part sequentially by delegating.
- Budget-related escalations: if spend exceeds org limits, block and notify admin.
- Quality monitoring: evaluate agent responses for accuracy and helpfulness.
- When in doubt, ask the user for clarification rather than guessing.`,
```

**File:** apps/admin/lib/agents/maintenance-triage.ts (L18-22)
```typescript
Decision rules:
- Critical issues (water leak, gas, fire): immediate escalation + emergency vendor dispatch.
- Vendor selection scoring: specialty 40% + rating 30% + availability 20% + proximity 10%.
- SLA breach: auto-escalate, re-assign, notify property manager.
- Always create a task for every maintenance request.`,
```

**File:** apps/admin/lib/agents/finance-agent.ts (L19-24)
```typescript
Decision rules:
- All financial calculations must include IVA (10%) for Paraguay.
- Currency is PYG (Paraguayan Guaraní) unless the property uses USD.
- Flag discrepancies > 5% between expected and actual collections.
- Owner statements should reconcile to the penny.
- For bulk financial operations, present a summary before executing.`,
```

**File:** apps/backend-rs/src/services/ai_guest_reply.rs (L15-20)
```rust
const GUEST_CONCIERGE_SLUG: &str = "guest-concierge";
const LOW_CONFIDENCE_THRESHOLD: f64 = 0.8;

/// Process an inbound guest message with the AI guest concierge agent.
/// Uses the full agent loop with tool calling (knowledge base, reservation lookup, etc.).
/// Returns the generated reply text and a confidence score (0.0-1.0).
```

**File:** README.md (L113-120)
```markdown

- This scaffold is intentionally implementation-first and schema-aligned.
- Business logic is starter-level; production rollout should add:
  - stronger auth enforcement
  - audit hooks on all writes
  - idempotency keys for external sync
  - background jobs for iCal and messaging dispatch

```

**File:** apps/admin/lib/agents/guest-concierge.ts (L19-24)
```typescript
CRITICAL RULES:
- KNOWLEDGE FIRST: Before answering ANY question about property policies, procedures, amenities, check-in instructions, house rules, or FAQ-type questions, ALWAYS call search_knowledge first. Never guess or fabricate property-specific information.
- AUTO-MEMORY: After resolving a guest issue or learning a new fact about a guest or property, call store_memory to persist it for future reference. Use context_type='episodic' for interaction outcomes, 'entity' for guest/property facts.
- For financial operations over $5,000, recommend human review.
- When unsure about a domain (maintenance, leasing, pricing), delegate to the specialist agent using classify_and_delegate.
- Keep responses concise and action-oriented. Use tables for multi-row data.
```

**File:** apps/backend-rs/src/routes/guest_portal.rs (L1-1)
```rust
use axum::{extract::State, http::HeaderMap, response::IntoResponse, Json};
```

**File:** apps/backend-rs/src/routes/vendor_portal.rs (L1-1)
```rust
use axum::{
```

**File:** apps/backend-rs/src/routes/owner_portal.rs (L1-1)
```rust
use axum::extract::Path;
```

**File:** apps/backend-rs/src/routes/subscriptions.rs (L21-38)
```rust
pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/subscription-plans", axum::routing::get(list_plans))
        .route(
            "/billing/current",
            axum::routing::get(get_current_subscription),
        )
        .route("/billing/subscribe", axum::routing::post(subscribe))
        .route("/billing/cancel", axum::routing::post(cancel_subscription))
        .route(
            "/public/subscription-plans",
            axum::routing::get(list_public_plans),
        )
        .route(
            "/billing/usage",
            axum::routing::get(get_usage_summary),
        )
}
```

**File:** apps/backend-rs/src/routes/agent_playbooks.rs (L27-60)
```rust
pub fn router() -> axum::Router<AppState> {
    axum::Router::new().route(
        "/internal/agent-playbooks/run",
        axum::routing::post(run_agent_playbook),
    )
}

async fn run_agent_playbook(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RunAgentPlaybookInput>,
) -> AppResult<Json<Value>> {
    let api_key = headers
        .get("x-api-key")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    validate_internal_api_key(
        state.config.is_production(),
        state.config.internal_api_key.as_deref(),
        api_key,
    )?;

    let org_id = payload.org_id.trim();
    let message = payload.message.trim();
    if org_id.is_empty() || message.is_empty() {
        return Err(AppError::BadRequest(
            "org_id and message are required.".to_string(),
        ));
    }

    let (agent_slug, agent_name, agent_prompt, allowed_tools) =
        resolve_agent_profile(&state, payload.agent_slug.as_deref()).await?;

    let result = run_ai_agent_chat(
```

**File:** apps/admin/app/(admin)/module (L1-1)
```text
[{"name":"[slug]","path":"apps/admin/app/(admin)/module/[slug]","sha":"93be6d5fe14392e21f8e153685673e96ea177c01","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/[slug]?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/[slug]","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/93be6d5fe14392e21f8e153685673e96ea177c01","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/[slug]?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/93be6d5fe14392e21f8e153685673e96ea177c01","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/[slug]"}},{"name":"agent-config","path":"apps/admin/app/(admin)/module/agent-config","sha":"94a31d3b2e4df218d8de194315b6b36d5e52f552","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-config?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-config","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/94a31d3b2e4df218d8de194315b6b36d5e52f552","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-config?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/94a31d3b2e4df218d8de194315b6b36d5e52f552","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-config"}},{"name":"agent-dashboard","path":"apps/admin/app/(admin)/module/agent-dashboard","sha":"bf28e93ee095d357d583011626e47384aeef1abf","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-dashboard?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-dashboard","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/bf28e93ee095d357d583011626e47384aeef1abf","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-dashboard?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/bf28e93ee095d357d583011626e47384aeef1abf","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-dashboard"}},{"name":"agent-playground","path":"apps/admin/app/(admin)/module/agent-playground","sha":"3ca77551a43ca3c8a4d35032f6cc7a4df8b7108c","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-playground?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-playground","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/3ca77551a43ca3c8a4d35032f6cc7a4df8b7108c","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/agent-playground?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/3ca77551a43ca3c8a4d35032f6cc7a4df8b7108c","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/agent-playground"}},{"name":"applications","path":"apps/admin/app/(admin)/module/applications","sha":"df5568150beaea90f5b681fd11fec112f72e9628","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/applications?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/applications","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/df5568150beaea90f5b681fd11fec112f72e9628","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/applications?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/df5568150beaea90f5b681fd11fec112f72e9628","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/applications"}},{"name":"audit-logs","path":"apps/admin/app/(admin)/module/audit-logs","sha":"c5fcbe7d42972dccaf78251c996421af1dfeb3e0","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/audit-logs?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/audit-logs","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/c5fcbe7d42972dccaf78251c996421af1dfeb3e0","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/audit-logs?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/c5fcbe7d42972dccaf78251c996421af1dfeb3e0","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/audit-logs"}},{"name":"automations","path":"apps/admin/app/(admin)/module/automations","sha":"e64a4eee3d980d1066fa6320a510c1e77ce6764b","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/automations?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/automations","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/e64a4eee3d980d1066fa6320a510c1e77ce6764b","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/automations?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/e64a4eee3d980d1066fa6320a510c1e77ce6764b","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/automations"}},{"name":"billing","path":"apps/admin/app/(admin)/module/billing","sha":"6142f1a80dcb73b8a1d0b4f9e11b37b36a033cdd","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/billing?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/billing","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/6142f1a80dcb73b8a1d0b4f9e11b37b36a033cdd","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/billing?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/6142f1a80dcb73b8a1d0b4f9e11b37b36a033cdd","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/billing"}},{"name":"calendar","path":"apps/admin/app/(admin)/module/calendar","sha":"d29eb17a1083e9841317305e5ac3a42f238bb621","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/calendar?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/calendar","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/d29eb17a1083e9841317305e5ac3a42f238bb621","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/calendar?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/d29eb17a1083e9841317305e5ac3a42f238bb621","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/calendar"}},{"name":"channels","path":"apps/admin/app/(admin)/module/channels","sha":"bac44deabd84734e3c5db18da125dee0fc11e385","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/channels?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/channels","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/bac44deabd84734e3c5db18da125dee0fc11e385","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/channels?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/bac44deabd84734e3c5db18da125dee0fc11e385","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/channels"}},{"name":"collections","path":"apps/admin/app/(admin)/module/collections","sha":"db14060e58efa151680daa38c7e6d0f5886d1887","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/collections?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/collections","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/db14060e58efa151680daa38c7e6d0f5886d1887","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/collections?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/db14060e58efa151680daa38c7e6d0f5886d1887","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/collections"}},{"name":"documents","path":"apps/admin/app/(admin)/module/documents","sha":"415fbe4e840c2fb1654567e33df44e9099629b90","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/documents?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/documents","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/415fbe4e840c2fb1654567e33df44e9099629b90","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/documents?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/415fbe4e840c2fb1654567e33df44e9099629b90","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/documents"}},{"name":"expenses","path":"apps/admin/app/(admin)/module/expenses","sha":"5fcb40a35943d5074213039b8c84a6b05d436274","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/expenses?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/expenses","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/5fcb40a35943d5074213039b8c84a6b05d436274","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/expenses?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/5fcb40a35943d5074213039b8c84a6b05d436274","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/expenses"}},{"name":"governance","path":"apps/admin/app/(admin)/module/governance","sha":"33bcf002ad401ab38fd616546b24e2f379c9461d","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/governance?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/governance","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/33bcf002ad401ab38fd616546b24e2f379c9461d","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/governance?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/33bcf002ad401ab38fd616546b24e2f379c9461d","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/governance"}},{"name":"guests","path":"apps/admin/app/(admin)/module/guests","sha":"85ac36114538e2b4343d25cec87ccc38495a1666","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/guests?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/guests","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/85ac36114538e2b4343d25cec87ccc38495a1666","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/guests?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/85ac36114538e2b4343d25cec87ccc38495a1666","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/guests"}},{"name":"inspections","path":"apps/admin/app/(admin)/module/inspections","sha":"6c7eb002fc47ece7ec47b4a5c76112b5cd3937b4","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/inspections?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/inspections","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/6c7eb002fc47ece7ec47b4a5c76112b5cd3937b4","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/inspections?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/6c7eb002fc47ece7ec47b4a5c76112b5cd3937b4","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/inspections"}},{"name":"integrations","path":"apps/admin/app/(admin)/module/integrations","sha":"9f735b0ccb518e5e847654517474d0abac9fdb1e","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/integrations?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/integrations","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/9f735b0ccb518e5e847654517474d0abac9fdb1e","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/integrations?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/9f735b0ccb518e5e847654517474d0abac9fdb1e","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/integrations"}},{"name":"knowledge","path":"apps/admin/app/(admin)/module/knowledge","sha":"ae79363b33d852403473fec4d3a76e4942615a29","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/knowledge?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/knowledge","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/ae79363b33d852403473fec4d3a76e4942615a29","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/knowledge?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/ae79363b33d852403473fec4d3a76e4942615a29","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/knowledge"}},{"name":"leases","path":"apps/admin/app/(admin)/module/leases","sha":"c3418bfc00a9ef96cd3ac3b6d747f7ceb8494d79","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/leases?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/leases","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/c3418bfc00a9ef96cd3ac3b6d747f7ceb8494d79","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/leases?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/c3418bfc00a9ef96cd3ac3b6d747f7ceb8494d79","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/leases"}},{"name":"listings","path":"apps/admin/app/(admin)/module/listings","sha":"a1ff99db0b88645f7d6b89e6270bea083ea20e43","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/listings?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/listings","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/a1ff99db0b88645f7d6b89e6270bea083ea20e43","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/listings?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/a1ff99db0b88645f7d6b89e6270bea083ea20e43","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/listings"}},{"name":"maintenance","path":"apps/admin/app/(admin)/module/maintenance","sha":"24cc6f5b3a8ffed35991559ebde94e05199dea33","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/maintenance?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/maintenance","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/24cc6f5b3a8ffed35991559ebde94e05199dea33","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/maintenance?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/24cc6f5b3a8ffed35991559ebde94e05199dea33","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/maintenance"}},{"name":"messaging","path":"apps/admin/app/(admin)/module/messaging","sha":"d5339e7e876dd34930dfce66abc6c362a3de6d64","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/messaging?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/messaging","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/d5339e7e876dd34930dfce66abc6c362a3de6d64","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/messaging?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/d5339e7e876dd34930dfce66abc6c362a3de6d64","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/messaging"}},{"name":"notification-rules","path":"apps/admin/app/(admin)/module/notification-rules","sha":"6bb964cb0efa07b7aa31bf86731cb02ded7db448","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/notification-rules?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/notification-rules","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/6bb964cb0efa07b7aa31bf86731cb02ded7db448","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/notification-rules?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/6bb964cb0efa07b7aa31bf86731cb02ded7db448","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/notification-rules"}},{"name":"notifications","path":"apps/admin/app/(admin)/module/notifications","sha":"ebdd8203310bea78e6310605e178ce7e783184bf","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/notifications?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/notifications","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/ebdd8203310bea78e6310605e178ce7e783184bf","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/notifications?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/ebdd8203310bea78e6310605e178ce7e783184bf","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/notifications"}},{"name":"operations","path":"apps/admin/app/(admin)/module/operations","sha":"3368f13a81ed25507d92256d44ffb1f3930764b9","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/operations?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/operations","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/3368f13a81ed25507d92256d44ffb1f3930764b9","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/operations?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/3368f13a81ed25507d92256d44ffb1f3930764b9","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/operations"}},{"name":"owner-statements","path":"apps/admin/app/(admin)/module/owner-statements","sha":"397cbaf900fca89d45a3b8f83afa87d919f5ceb8","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/owner-statements?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/owner-statements","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/397cbaf900fca89d45a3b8f83afa87d919f5ceb8","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/owner-statements?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/397cbaf900fca89d45a3b8f83afa87d919f5ceb8","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/owner-statements"}},{"name":"portfolio","path":"apps/admin/app/(admin)/module/portfolio","sha":"73d4111d75afbc5c54ba066ff76ee05c756bd438","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/portfolio?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/portfolio","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/73d4111d75afbc5c54ba066ff76ee05c756bd438","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/portfolio?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/73d4111d75afbc5c54ba066ff76ee05c756bd438","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/portfolio"}},{"name":"pricing","path":"apps/admin/app/(admin)/module/pricing","sha":"8293abe7cd3c3724d64c6fe3aaf5926952e05c94","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/pricing?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/pricing","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/8293abe7cd3c3724d64c6fe3aaf5926952e05c94","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/pricing?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/8293abe7cd3c3724d64c6fe3aaf5926952e05c94","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/pricing"}},{"name":"properties","path":"apps/admin/app/(admin)/module/properties","sha":"e75872fb105b9fadb2a36605105354c5fdd9821d","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/properties?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/properties","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/e75872fb105b9fadb2a36605105354c5fdd9821d","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/properties?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/e75872fb105b9fadb2a36605105354c5fdd9821d","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/properties"}},{"name":"reports","path":"apps/admin/app/(admin)/module/reports","sha":"3f90fdc1f6f1663f2708da67d784fd961094e013","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reports?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reports","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/3f90fdc1f6f1663f2708da67d784fd961094e013","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reports?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/3f90fdc1f6f1663f2708da67d784fd961094e013","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reports"}},{"name":"reservations","path":"apps/admin/app/(admin)/module/reservations","sha":"5cbb8ebec4c1d697e2d01e29e12b7a2bb7c98241","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reservations?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reservations","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/5cbb8ebec4c1d697e2d01e29e12b7a2bb7c98241","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reservations?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/5cbb8ebec4c1d697e2d01e29e12b7a2bb7c98241","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reservations"}},{"name":"reviews","path":"apps/admin/app/(admin)/module/reviews","sha":"14890c99dee55863f77e265cb1f26bfdc92275c8","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reviews?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reviews","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/14890c99dee55863f77e265cb1f26bfdc92275c8","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/reviews?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/14890c99dee55863f77e265cb1f26bfdc92275c8","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/reviews"}},{"name":"sequences","path":"apps/admin/app/(admin)/module/sequences","sha":"1b842be073ebe21f1a8ad40ccbbd32ce7cfe7360","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/sequences?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/sequences","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/1b842be073ebe21f1a8ad40ccbbd32ce7cfe7360","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/sequences?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/1b842be073ebe21f1a8ad40ccbbd32ce7cfe7360","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/sequences"}},{"name":"tasks","path":"apps/admin/app/(admin)/module/tasks","sha":"5be83b256ca3415f94425ab7273709896d0aa3d5","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/tasks?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/tasks","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/5be83b256ca3415f94425ab7273709896d0aa3d5","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/tasks?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/5be83b256ca3415f94425ab7273709896d0aa3d5","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/tasks"}},{"name":"transparency-summary","path":"apps/admin/app/(admin)/module/transparency-summary","sha":"e37df83fa066d5ac9de5f5068fd377233ba2b8ff","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/transparency-summary?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/transparency-summary","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/e37df83fa066d5ac9de5f5068fd377233ba2b8ff","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/transparency-summary?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/e37df83fa066d5ac9de5f5068fd377233ba2b8ff","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/transparency-summary"}},{"name":"units","path":"apps/admin/app/(admin)/module/units","sha":"259300e5a361929737661ad67b7ee769fd2f7c60","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/units?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/units","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/259300e5a361929737661ad67b7ee769fd2f7c60","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/units?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/259300e5a361929737661ad67b7ee769fd2f7c60","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/units"}},{"name":"voice","path":"apps/admin/app/(admin)/module/voice","sha":"ba3a63874998fc645d1a9e828d09acb9b82436ce","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/voice?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/voice","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/ba3a63874998fc645d1a9e828d09acb9b82436ce","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/voice?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/ba3a63874998fc645d1a9e828d09acb9b82436ce","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/voice"}},{"name":"workflow-rules","path":"apps/admin/app/(admin)/module/workflow-rules","sha":"5ae8a7617a57e27ac550d0cb056997bfcb99fa1b","size":0,"url":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/workflow-rules?ref=main","html_url":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/workflow-rules","git_url":"https://api.github.com/repos/rossostudios/casaora/git/trees/5ae8a7617a57e27ac550d0cb056997bfcb99fa1b","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/rossostudios/casaora/contents/apps/admin/app/(admin)/module/workflow-rules?ref=main","git":"https://api.github.com/repos/rossostudios/casaora/git/trees/5ae8a7617a57e27ac550d0cb056997bfcb99fa1b","html":"https://github.com/rossostudios/casaora/tree/main/apps/admin/app/(admin)/module/workflow-rules"}}]
```

**File:** apps/backend-rs/src/services/airbnb.rs (L1-1)
```rust
use reqwest::Client;
```

**File:** db/schema.sql (L31-36)
```sql
  'airbnb',
  'bookingcom',
  'direct',
  'vrbo',
  'other'
);
```

**File:** plan.md (L18-76)
```markdown

### What’s Missing for a “Full” AI Agentic Property Management SaaS

A complete AI-agentic PMS goes far beyond CRUD + basic automation. It becomes a system where specialized **autonomous agents** (comms, ops, finance, pricing, etc.) can reason, use tools (your DB/API, external services), execute multi-step workflows, learn from history, and operate 24/7 with human oversight only on high-stakes decisions. Think of it as “digital staff” that handles 70-80% of repetitive work.

#### 1. Core Property Management SaaS Features (Still Missing or Minimal)
These are table-stakes for any serious PMS (Buildium, AppFolio, TenantCloud, etc.) and especially for scaling beyond tiny STR portfolios.

- **Payment processing & reconciliation** — No in-app collections, deposits, owner disbursements, or automated bank/ACH integration (Stripe, Mercado Pago, local PY gateways). Statements exist but are manual.
- **Guest/tenant self-service portal** — No dedicated portal where guests can view their booking, upload docs, make payments, submit maintenance requests, or access smart-lock codes.
- **Vendor/contractor portal** — Cleaners/maintenance teams need their own mobile/web view to accept jobs, upload before/after photos, mark checklists complete.
- **Document management & e-sign** — Leases, NDAs, inspection reports, insurance docs (generate PDFs, store securely, e-sign via DocuSign/Hellosign).
- **Deeper OTA/channel integrations** — Move from read-only iCal to two-way API sync (Airbnb, Booking.com, Vrbo) with real-time availability/pricing updates.
- **Full mobile apps** — The Expo scaffold exists; needs production-ready flows for staff (tasks + photos + offline), owners (reports + payouts), and guests.
- **Advanced accounting & trust compliance** — General ledger, automated reconciliation, PY tax reporting (IVA, IRP), multi-currency payouts.
- **SaaS billing & subscription tiers for your platform itself** — You support multi-org, but no Stripe billing, usage-based pricing, feature gating, or trial/onboarding flows.
- **Digital inspections, photo evidence, and preventive maintenance schedules**.
- **Review & reputation management** (auto-request reviews, respond to OTA feedback).

#### 2. Agentic AI Capabilities (The Real Differentiator)
You already have the **approval-first runtime + inbox** — that’s a fantastic safety-first starting point (human-in-the-loop prevents costly mistakes). Phase 3 of your PRD even calls out “AI-assisted guest communication & task triage.” You’re ahead of most, but a *full* agentic system needs this expanded dramatically.

**Missing agentic layers** (prioritized):

| Priority | Agent / Capability | Why It Matters | How It Builds on What You Have |
|----------|---------------------|----------------|--------------------------------|
| High | **Guest Communication Agent** | 24/7 WhatsApp/email responses, pre-arrival info, issue handling, upsells | Uses your messaging templates + reservation/guest data + LLM tool-calling |
| High | **Task & Maintenance Agent** | Auto-triage requests, assign cleaners, schedule, escalate delays, predict issues | Extends your task model + calendar + approval inbox |
| High | **Dynamic Pricing Agent** (Phase 2 in PRD) | Competitor monitoring, demand forecasting, auto-update rates on channels | Uses reservation history + external market data |
| High | **Finance & Reporting Agent** | Auto-generate & send owner statements, flag anomalies, suggest optimizations | Builds directly on owner statements + expense tables |
| Medium | **Lead Qualification & Direct Booking Agent** | Handle website inquiries, qualify, create reservations | Integrates with your public web app |
| Medium | **Predictive Maintenance & Portfolio Agent** | Forecast repairs from history/weather, optimize portfolio occupancy | Needs IoT/smart-lock data later |
| Medium | **Multi-agent Orchestrator + Workflow Builder** | Supervisor agent delegates to specialists; no-code workflow UI for users | Your current runtime becomes the execution engine |
| Medium | **RAG Knowledge Base + Memory** | Agents remember past guest issues, property quirks, local regs | Critical for accurate Paraguay-specific behavior |
| Low | **Image/Virtual Tour Agent** | Analyze property photos for quality/staging, generate descriptions | Nice-to-have for listings |
| Low | **Smart Home / IoT Agent** | Auto-issue lock codes, monitor occupancy sensors | Future-proofing |

**Technical gaps for agentic depth**:
- Robust tool-calling + long-running agent memory (LangGraph, CrewAI, or custom Rust + Anthropic/OpenAI/Grok APIs).
- Agent dashboard (monitor running agents, intervention logs, performance metrics).
- Human-in-the-loop escalation paths beyond the current inbox.
- Evaluation & safety guardrails (especially for financial or access-related actions).
- Local LLM options or hybrid (for cost/privacy in Paraguay).

#### 3. Other Polish & Scale Items
- Advanced analytics UI + dashboards (not just API reports).
- Localization/compliance depth (PY-specific tax rules, data residency).
- Onboarding wizard, demo data, video tutorials.
- Marketing site with live demo (beyond login wall).
- Security audit, rate limiting, SOC2 readiness.

### Recommended Next Steps (Realistic Roadmap)
1. **Short-term (next 4–8 weeks)** — Finish Phase 1 polish (stronger auth/audit, background jobs for iCal + messaging). Ship payment integration (Stripe/Mercado Pago) and basic guest portal. Expand the approval inbox into a proper agent dashboard.
2. **Medium-term** — Build the Guest Comm + Task Triage agents (Phase 3). Add dynamic pricing. Release full staff mobile app.
3. **Agentic leap** — Introduce a no-code agent builder + multi-agent supervisor on top of your existing runtime. Start with RAG over your DB + docs.
4. **Monetization** — Add SaaS billing so you can charge property managers.

**Bottom line**: You already have one of the cleanest tech foundations I’ve seen for a new PMS (Rust + Supabase is a killer combo for reliability and low ops cost). With the agent runtime already prototyped, you’re 6–12 months from a genuinely differentiated **AI-agentic** product that can compete with (and beat on cost/latency) the big US players in the LATAM/STR niche.

```
