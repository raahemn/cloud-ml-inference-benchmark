locals {
  variant = "cloudrun"
}

module "common" {
  source                     = "../modules/common"
  project_id                 = var.project_id
  region                     = var.region
  variant                    = local.variant
  artifact_registry_location = var.artifact_registry_location
  training_bucket_location   = var.region
  model_bucket_name          = var.model_bucket_name
}

module "grpc_model" {
  source                = "../modules/cloud_run_service"
  project_id            = var.project_id
  region                = var.region
  service_name          = "${module.common.prefix}-grpc-model"
  image                 = var.grpc_model_image
  service_account_email = module.common.grpc_model_service_account_email
  memory_limit          = "1Gi"
  cpu_limit             = "1"
  cpu_idle              = false
  max_instance_count    = 3
}

module "coordinator" {
  source                = "../modules/cloud_run_service"
  project_id            = var.project_id
  region                = var.region
  service_name          = "${module.common.prefix}-coordinator"
  image                 = var.coordinator_image
  service_account_email = module.common.coordinator_service_account_email
  cpu_limit             = "1"
  cpu_idle              = false
  max_instance_count    = 3
  env_vars = {
    COORDINATOR_BIND      = "0.0.0.0:8080"
    GRPC_INFERENCE_URL    = module.grpc_model.uri
    TRAINING_DATA_BUCKET  = module.common.training_bucket_name
    TRAINING_TRIGGER_TOPIC = module.common.training_trigger_topic_id
  }
}

module "training_service" {
  source                          = "../modules/cloud_run_service"
  project_id                      = var.project_id
  region                          = var.region
  service_name                    = "${module.common.prefix}-training-service"
  image                           = var.training_service_image
  service_account_email           = module.common.training_service_account_email
  allow_unauthenticated           = false
  memory_limit                    = "4Gi"
  cpu_limit                       = "2"
  cpu_idle                        = false
  min_instance_count              = 1
  max_instance_count              = 1
  max_instance_request_concurrency = 1
  env_vars = {
    PROJECT_ID         = var.project_id
    DATA_BUCKET        = module.common.training_bucket_name
    MODEL_BUCKET       = var.model_bucket_name
    TRAINING_SUB       = module.common.training_trigger_subscription_name
    TRAINING_THRESHOLD = tostring(var.training_threshold)
  }
}

resource "google_compute_global_address" "lb_ip" {
  project = var.project_id
  name    = "${module.common.prefix}-lb-ip"
}

resource "google_compute_region_network_endpoint_group" "coordinator_neg" {
  project               = var.project_id
  name                  = "${module.common.prefix}-coord-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = module.coordinator.name
  }
}

resource "google_compute_backend_service" "coordinator_backend" {
  project               = var.project_id
  name                  = "${module.common.prefix}-coord-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.coordinator_neg.id
  }
}

resource "google_compute_url_map" "coordinator" {
  project         = var.project_id
  name            = "${module.common.prefix}-url-map"
  default_service = google_compute_backend_service.coordinator_backend.id
}

resource "google_compute_target_http_proxy" "coordinator" {
  project = var.project_id
  name    = "${module.common.prefix}-http-proxy"
  url_map = google_compute_url_map.coordinator.id
}

resource "google_compute_global_forwarding_rule" "coordinator_http" {
  project               = var.project_id
  name                  = "${module.common.prefix}-http-fr"
  target                = google_compute_target_http_proxy.coordinator.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
