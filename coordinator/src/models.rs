use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResponse {
    pub class_id: i32,
    pub confidence: f32,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiErrorResponse {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub service: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingSampleResponse {
    pub label: String,
    pub saved_path: String,
    pub bytes_written: usize,
}
