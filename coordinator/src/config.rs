use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub bind_address: String,
    pub grpc_inference_url: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            bind_address: read_env("COORDINATOR_BIND", "0.0.0.0:8000"),
            grpc_inference_url: read_env("GRPC_INFERENCE_URL", "http://127.0.0.1:50051"),
        }
    }
}

fn read_env(key: &str, default_value: &str) -> String {
    env::var(key).unwrap_or_else(|_| default_value.to_string())
}
