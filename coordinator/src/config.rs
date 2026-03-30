use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub bind_address: String,
    pub grpc_inference_url: String,
    pub training_data_dir: String,
    pub training_data_bucket: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            bind_address: read_env("COORDINATOR_BIND", "0.0.0.0:8000"),
            grpc_inference_url: read_env("GRPC_INFERENCE_URL", "http://127.0.0.1:50051"),
            training_data_dir: read_env("TRAINING_DATA_DIR", "training-data"),
            training_data_bucket: read_optional_env("TRAINING_DATA_BUCKET"),
        }
    }
}

fn read_env(key: &str, default_value: &str) -> String {
    env::var(key).unwrap_or_else(|_| default_value.to_string())
}

fn read_optional_env(key: &str) -> Option<String> {
    env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}
