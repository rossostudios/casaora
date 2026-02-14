#![allow(dead_code)]

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Forbidden: {0}")]
    Forbidden(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Gone: {0}")]
    Gone(String),
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Unprocessable entity: {0}")]
    UnprocessableEntity(String),
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Dependency failure: {0}")]
    Dependency(String),
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Not implemented: {0}")]
    NotImplemented(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_) => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Gone(_) => StatusCode::GONE,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::UnprocessableEntity(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            Self::Dependency(_) => StatusCode::BAD_GATEWAY,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::NotImplemented(_) => StatusCode::NOT_IMPLEMENTED,
        }
    }

    pub fn detail_message(&self) -> String {
        match self {
            Self::Unauthorized(message)
            | Self::Forbidden(message)
            | Self::NotFound(message)
            | Self::Conflict(message)
            | Self::Gone(message)
            | Self::BadRequest(message)
            | Self::UnprocessableEntity(message)
            | Self::ServiceUnavailable(message)
            | Self::Dependency(message)
            | Self::Internal(message)
            | Self::NotImplemented(message) => message.clone(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = Json(json!({ "detail": self.detail_message() }));
        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
