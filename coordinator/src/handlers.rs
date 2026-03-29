use actix_multipart::Multipart;
use actix_web::{get, post, web, HttpResponse, Responder};
use futures_util::StreamExt;

use crate::config::AppConfig;
use crate::inference::model_inference_client::ModelInferenceClient;
use crate::inference::PredictRequest;
use crate::models::{ApiErrorResponse, HealthResponse, InferenceResponse};

#[derive(Clone)]
pub struct AppState {
    pub grpc_inference_url: String,
}

impl AppState {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            // Flow 2:
            // Save the gRPC endpoint exposed by the teammate's inference service.
            grpc_inference_url: config.grpc_inference_url.clone(),
        }
    }
}

#[post("/predict")]
pub async fn predict(
    state: web::Data<AppState>,
    mut payload: Multipart,
) -> impl Responder {
    // Flow P1:
    // Frontend uploads an image file to /predict as multipart/form-data.
    let mut image_bytes = Vec::new();

    while let Some(field_result) = payload.next().await {
        let mut field = match field_result {
            Ok(field) => field,
            Err(error) => {
                return HttpResponse::BadRequest().json(ApiErrorResponse {
                    message: format!("failed to read upload field: {error}"),
                });
            }
        };

        while let Some(chunk_result) = field.next().await {
            let chunk = match chunk_result {
                Ok(chunk) => chunk,
                Err(error) => {
                    return HttpResponse::BadRequest().json(ApiErrorResponse {
                        message: format!("failed to read uploaded file: {error}"),
                    });
                }
            };

            image_bytes.extend_from_slice(&chunk);
        }
    }

    if image_bytes.is_empty() {
        return HttpResponse::BadRequest().json(ApiErrorResponse {
            message: "no image file was uploaded".to_string(),
        });
    }

    // Flow P2:
    // Coordinator forwards the raw bytes directly to the gRPC inference service.
    let grpc_response = match ModelInferenceClient::connect(state.grpc_inference_url.clone()).await {
        Ok(mut client) => client
            .predict(PredictRequest { image_data: image_bytes })
            .await,
        Err(error) => {
            return HttpResponse::BadGateway().json(ApiErrorResponse {
                message: format!("failed to connect to gRPC inference service: {error}"),
            });
        }
    };

    match grpc_response {
        Ok(response) => {
            let prediction = response.into_inner();
            HttpResponse::Ok().json(InferenceResponse {
                class_id: prediction.class_id,
                confidence: prediction.confidence,
                label: prediction.label,
            })
        }
        Err(error) => HttpResponse::BadGateway().json(ApiErrorResponse {
            message: format!("gRPC inference request failed: {error}"),
        }),
    }
}

#[get("/health")]
pub async fn health() -> impl Responder {
    // Flow 3:
    // Simple liveness check for humans, load balancers, and monitoring.
    HttpResponse::Ok().json(HealthResponse {
        service: "rust-coordinator".to_string(),
        status: "ok".to_string(),
    })
}
