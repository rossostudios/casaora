use serde_json::Value;

pub async fn get_usd_to_pyg_rate(http_client: &reqwest::Client, value_date: &str) -> Option<f64> {
    let day = value_date.trim();
    if day.is_empty() {
        return None;
    }

    let sources = [
        format!(
            "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{day}/v1/currencies/usd/pyg.json"
        ),
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd/pyg.json"
            .to_string(),
        "https://open.er-api.com/v6/latest/USD".to_string(),
    ];

    for source in sources {
        let Some(payload) = fetch_json(http_client, &source).await else {
            continue;
        };
        if let Some(rate) = parse_rate(&payload) {
            if rate > 0.0 {
                return Some(rate);
            }
        }
    }

    None
}

async fn fetch_json(http_client: &reqwest::Client, url: &str) -> Option<Value> {
    let response = http_client
        .get(url)
        .header("Accept", "application/json")
        .header("User-Agent", "puerta-abierta/1.0")
        .send()
        .await
        .ok()?;

    let ok_response = response.error_for_status().ok()?;
    ok_response.json::<Value>().await.ok()
}

fn parse_rate(payload: &Value) -> Option<f64> {
    if let Some(rate) = payload.get("pyg").and_then(numeric_value) {
        return Some(rate);
    }

    payload
        .get("rates")
        .and_then(Value::as_object)
        .and_then(|rates| rates.get("PYG"))
        .and_then(numeric_value)
}

fn numeric_value(value: &Value) -> Option<f64> {
    match value {
        Value::Number(number) => number.as_f64(),
        Value::String(text) => text.trim().parse::<f64>().ok(),
        _ => None,
    }
}
