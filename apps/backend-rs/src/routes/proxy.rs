use axum::{
    body::{Body, Bytes},
    extract::State,
    http::{HeaderMap, HeaderName, HeaderValue, Method, Response, StatusCode, Uri},
    response::IntoResponse,
    Json,
};
use serde_json::json;

use crate::state::AppState;

pub async fn proxy_unmigrated(
    State(state): State<AppState>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Bytes,
) -> axum::response::Response {
    let Some(base_url) = state.config.proxy_unmigrated_to.as_ref() else {
        let payload = Json(json!({
            "detail": "Route is not migrated to Rust yet. Set PROXY_UNMIGRATED_TO to enable passthrough."
        }));
        return (StatusCode::NOT_IMPLEMENTED, payload).into_response();
    };

    let target = format!(
        "{}{}",
        base_url.trim_end_matches('/'),
        uri.path_and_query()
            .map(|value| value.as_str())
            .unwrap_or(uri.path())
    );

    let mut request = state.http_client.request(method.clone(), target);
    for (key, value) in &headers {
        let name = key.as_str().to_ascii_lowercase();
        if name == "host" || name == "content-length" {
            continue;
        }
        request = request.header(key, value);
    }

    let response = match request.body(body.to_vec()).send().await {
        Ok(value) => value,
        Err(error) => {
            let payload = Json(json!({
                "detail": format!("Proxy request failed: {error}")
            }));
            return (StatusCode::BAD_GATEWAY, payload).into_response();
        }
    };

    let status = response.status();
    let upstream_headers = response.headers().clone();
    let bytes = match response.bytes().await {
        Ok(value) => value,
        Err(error) => {
            let payload = Json(json!({
                "detail": format!("Could not read proxy response: {error}")
            }));
            return (StatusCode::BAD_GATEWAY, payload).into_response();
        }
    };

    build_response(status, &upstream_headers, bytes)
}

fn build_response(
    status: reqwest::StatusCode,
    headers: &reqwest::header::HeaderMap,
    body: Bytes,
) -> axum::response::Response {
    let mut response = Response::builder()
        .status(StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY))
        .body(Body::from(body))
        .unwrap_or_else(|_| Response::new(Body::empty()));

    for (key, value) in headers {
        if let Ok(header_name) = HeaderName::from_bytes(key.as_str().as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_bytes(value.as_bytes()) {
                response.headers_mut().insert(header_name, header_value);
            }
        }
    }

    response
}
