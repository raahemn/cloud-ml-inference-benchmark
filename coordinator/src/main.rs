mod config;
mod handlers;
mod inference {
    tonic::include_proto!("app.proto");
}
mod models;

use actix_web::{web, App, HttpServer};
use actix_cors::Cors;

use crate::config::AppConfig;
use crate::handlers::{health, predict, upload_training_sample, AppState};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Flow 1:
    // Read startup values like the gRPC inference endpoint.
    let config = AppConfig::from_env();
    let bind_address = config.bind_address.clone();

    // Flow 2:
    // Build the shared state that every request handler will use.
    let state = AppState::new(&config);

    println!("Rust coordinator listening on {}", bind_address);

    // Flow 3:
    // Start the HTTP server and expose the main inference entry points:
    // /predict, /training-samples, and /health.
    HttpServer::new(move || {
        App::new()
            .wrap(Cors::permissive())
            .app_data(web::Data::new(state.clone()))
            .service(health)
            .service(predict)
            .service(upload_training_sample)
    })
    .bind(bind_address)?
    .run()
    .await
}
