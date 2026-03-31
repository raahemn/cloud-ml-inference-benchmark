mod config;
mod handlers;
mod inference {
    tonic::include_proto!("app.proto");
}
mod models;
mod telemetry;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use tracing::info;
use tracing_actix_web::TracingLogger;

use crate::config::AppConfig;
use crate::handlers::{health, predict, upload_training_sample, AppState};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let _telemetry = telemetry::init("ml-coordinator").map_err(|error| {
        std::io::Error::other(format!("failed to initialize telemetry: {error}"))
    })?;

    // Flow 1:
    // Read startup values like the gRPC inference endpoint.
    let config = AppConfig::from_env();
    let bind_address = config.bind_address.clone();

    // Flow 2:
    // Build the shared state that every request handler will use.
    let state = AppState::new(&config);

    info!(
        bind_address = %bind_address,
        grpc_inference_url = %config.grpc_inference_url,
        training_bucket = ?config.training_data_bucket,
        training_trigger_topic = ?config.training_trigger_topic,
        "Rust coordinator starting"
    );

    // Flow 3:
    // Start the HTTP server and expose the main inference entry points:
    // /predict, /training-samples, and /health.
    HttpServer::new(move || {
        App::new()
            .wrap(Cors::permissive())
            .wrap(TracingLogger::default())
            .app_data(web::Data::new(state.clone()))
            .service(health)
            .service(predict)
            .service(upload_training_sample)
    })
    .bind(bind_address)?
    .run()
    .await
}
