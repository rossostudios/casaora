use serde::Serialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize)]
pub struct ReadinessIssue {
    pub field: String,
    pub label: String,
    pub weight: u8,
    pub satisfied: bool,
    pub critical: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReadinessReport {
    pub score: u8,
    pub issues: Vec<ReadinessIssue>,
    pub blocking: bool,
}

/// Full readiness computation returning a detailed report with all 8 dimensions.
pub fn compute_readiness_report(obj: &Map<String, Value>) -> ReadinessReport {
    let mut issues = Vec::with_capacity(8);

    // cover_image (25pts, critical)
    let has_cover = obj
        .get("cover_image_url")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|v| !v.is_empty());
    issues.push(ReadinessIssue {
        field: "cover_image".to_string(),
        label: "Cover Image".to_string(),
        weight: 25,
        satisfied: has_cover,
        critical: true,
    });

    // fee_breakdown (25pts, critical)
    let fee_complete = obj
        .get("fee_breakdown_complete")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    issues.push(ReadinessIssue {
        field: "fee_lines".to_string(),
        label: "Fee Breakdown".to_string(),
        weight: 25,
        satisfied: fee_complete,
        critical: true,
    });

    // amenities >= 3 (15pts)
    let amenities_count = obj
        .get("amenities")
        .and_then(Value::as_array)
        .map(|a| a.len())
        .unwrap_or(0);
    issues.push(ReadinessIssue {
        field: "amenities".to_string(),
        label: "Amenities".to_string(),
        weight: 15,
        satisfied: amenities_count >= 3,
        critical: false,
    });

    // bedrooms (10pts)
    let has_bedrooms = obj
        .get("bedrooms")
        .is_some_and(|v| !v.is_null() && v.as_i64().is_some_and(|n| n > 0));
    issues.push(ReadinessIssue {
        field: "bedrooms".to_string(),
        label: "Bedrooms".to_string(),
        weight: 10,
        satisfied: has_bedrooms,
        critical: false,
    });

    // square_meters (10pts)
    let has_sqm = obj
        .get("square_meters")
        .is_some_and(|v| !v.is_null() && v.as_f64().is_some_and(|n| n > 0.0));
    issues.push(ReadinessIssue {
        field: "square_meters".to_string(),
        label: "Area (m²)".to_string(),
        weight: 10,
        satisfied: has_sqm,
        critical: false,
    });

    // available_from (5pts)
    let has_available = obj
        .get("available_from")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|v| !v.is_empty());
    issues.push(ReadinessIssue {
        field: "available_from".to_string(),
        label: "Available From".to_string(),
        weight: 5,
        satisfied: has_available,
        critical: false,
    });

    // minimum_lease (5pts)
    let has_lease = obj
        .get("minimum_lease_months")
        .is_some_and(|v| !v.is_null() && v.as_i64().is_some_and(|n| n > 0));
    issues.push(ReadinessIssue {
        field: "minimum_lease".to_string(),
        label: "Minimum Lease".to_string(),
        weight: 5,
        satisfied: has_lease,
        critical: false,
    });

    // description (5pts)
    let has_desc = obj
        .get("description")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|v| !v.is_empty());
    issues.push(ReadinessIssue {
        field: "description".to_string(),
        label: "Description".to_string(),
        weight: 5,
        satisfied: has_desc,
        critical: false,
    });

    let score: u8 = issues
        .iter()
        .filter(|i| i.satisfied)
        .map(|i| i.weight)
        .sum();

    let blocking = issues.iter().any(|i| i.critical && !i.satisfied);

    ReadinessReport {
        score,
        issues,
        blocking,
    }
}

/// Backward-compatible summary returning (score, blocking_field_names).
pub fn readiness_summary(obj: &Map<String, Value>) -> (u32, Vec<String>) {
    let report = compute_readiness_report(obj);
    let blocking: Vec<String> = report
        .issues
        .iter()
        .filter(|i| !i.satisfied)
        .map(|i| i.field.clone())
        .collect();
    (report.score as u32, blocking)
}
