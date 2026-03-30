use actix_multipart::Multipart;
use actix_web::{get, post, web, HttpResponse, Responder};
use futures_util::StreamExt;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::AppConfig;
use crate::inference::model_inference_client::ModelInferenceClient;
use crate::inference::PredictRequest;
use crate::models::{
    ApiErrorResponse, HealthResponse, InferenceResponse, TrainingSampleResponse,
};

#[derive(Clone)]
pub struct AppState {
    pub grpc_inference_url: String,
    pub training_data_dir: String,
    pub training_data_bucket: Option<String>,
}

impl AppState {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            // Flow 2:
            // Save the gRPC endpoint exposed by the teammate's inference service.
            grpc_inference_url: config.grpc_inference_url.clone(),
            // Flow 2b:
            // Save the base directory where labeled training samples will be collected.
            training_data_dir: config.training_data_dir.clone(),
            // Flow 2c:
            // Save the shared Cloud Storage bucket used for training samples when deployed.
            training_data_bucket: config.training_data_bucket.clone(),
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

#[post("/training")]
pub async fn upload_training_sample(
    state: web::Data<AppState>,
    mut payload: Multipart,
) -> impl Responder {
    // Flow T1:
    // Accept a multipart request with:
    // - file: the image to keep for training
    // - label: the class label to save it under
    let mut image_bytes = Vec::new();
    let mut label: Option<String> = None;
    let mut original_filename: Option<String> = None;
    let mut content_type: Option<String> = None;

    while let Some(field_result) = payload.next().await {
        let mut field = match field_result {
            Ok(field) => field,
            Err(error) => {
                return HttpResponse::BadRequest().json(ApiErrorResponse {
                    message: format!("failed to read upload field: {error}"),
                });
            }
        };

        let field_name = field.name().map(str::to_owned).unwrap_or_default();

        if field_name == "file" {
            original_filename = field
                .content_disposition()
                .and_then(|cd| cd.get_filename())
                .map(str::to_owned);
            content_type = field.content_type().map(|mime| mime.to_string());

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
        } else if field_name == "label" {
            let mut label_bytes = Vec::new();

            while let Some(chunk_result) = field.next().await {
                let chunk = match chunk_result {
                    Ok(chunk) => chunk,
                    Err(error) => {
                        return HttpResponse::BadRequest().json(ApiErrorResponse {
                            message: format!("failed to read label field: {error}"),
                        });
                    }
                };

                label_bytes.extend_from_slice(&chunk);
            }

            match String::from_utf8(label_bytes) {
                Ok(value) if !value.trim().is_empty() => {
                    label = Some(value.trim().to_string());
                }
                Ok(_) => {}
                Err(error) => {
                    return HttpResponse::BadRequest().json(ApiErrorResponse {
                        message: format!("label must be valid UTF-8 text: {error}"),
                    });
                }
            }
        }
    }

    if image_bytes.is_empty() {
        return HttpResponse::BadRequest().json(ApiErrorResponse {
            message: "no image file was uploaded".to_string(),
        });
    }

    let raw_label = match label {
        Some(label) => label,
        None => {
            return HttpResponse::BadRequest().json(ApiErrorResponse {
                message: "label is required".to_string(),
            });
        }
    };

    let safe_label = sanitize_segment(&raw_label);
    if safe_label.is_empty() {
        return HttpResponse::BadRequest().json(ApiErrorResponse {
            message: "label must contain at least one alphanumeric character".to_string(),
        });
    }

    let file_name = build_training_file_name(original_filename.as_deref());
    let content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());

    // Flow T2:
    // Persist the sample in a shared training bucket when configured; otherwise
    // fall back to the local label-based folder layout for local development.
    let saved_path = if let Some(bucket) = state.training_data_bucket.as_deref() {
        let object_name = format!("training-samples/{safe_label}/{file_name}");
        match upload_training_sample_to_gcs(bucket, &object_name, &content_type, image_bytes.clone()).await {
            Ok(path) => path,
            Err(error) => {
                return HttpResponse::InternalServerError().json(ApiErrorResponse {
                    message: format!("failed to upload training sample to Cloud Storage: {error}"),
                });
            }
        }
    } else {
        let label_dir = Path::new(&state.training_data_dir).join(&safe_label);
        if let Err(error) = std::fs::create_dir_all(&label_dir) {
            return HttpResponse::InternalServerError().json(ApiErrorResponse {
                message: format!("failed to create training data directory: {error}"),
            });
        }

        let saved_path = label_dir.join(file_name);

        if let Err(error) = std::fs::write(&saved_path, &image_bytes) {
            return HttpResponse::InternalServerError().json(ApiErrorResponse {
                message: format!("failed to save training sample: {error}"),
            });
        }

        saved_path.display().to_string()
    };

    HttpResponse::Ok().json(TrainingSampleResponse {
        label: raw_label,
        saved_path,
        bytes_written: image_bytes.len(),
    })
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

fn sanitize_segment(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

fn build_training_file_name(original_filename: Option<&str>) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);

    let extension = original_filename
        .and_then(|name| {
            PathBuf::from(name)
                .extension()
                .and_then(|ext| ext.to_str().map(str::to_owned))
        })
        .map(|value| sanitize_segment(&value))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "bin".to_string());

    format!("sample-{millis}.{extension}")
}

#[derive(serde::Deserialize)]
struct MetadataTokenResponse {
    access_token: String,
}

async fn upload_training_sample_to_gcs(
    bucket: &str,
    object_name: &str,
    content_type: &str,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let token = fetch_metadata_access_token(&client).await?;

    let mut upload_url = reqwest::Url::parse(&format!(
        "https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o"
    ))
    .map_err(|error| error.to_string())?;
    upload_url
        .query_pairs_mut()
        .append_pair("uploadType", "media")
        .append_pair("name", object_name);

    let response = client
        .post(upload_url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(CONTENT_TYPE, content_type)
        .body(bytes)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("upload failed with status {status}: {body}"));
    }

    Ok(format!("gs://{bucket}/{object_name}"))
}

async fn fetch_metadata_access_token(client: &reqwest::Client) -> Result<String, String> {
    let response = client
        .get("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token")
        .header("Metadata-Flavor", "Google")
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("metadata token request failed with status {status}: {body}"));
    }

    let token: MetadataTokenResponse = response.json().await.map_err(|error| error.to_string())?;
    Ok(token.access_token)
}
