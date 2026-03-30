locals {
  variant = "hybrid"
}

module "common" {
  source                     = "../modules/common"
  project_id                 = var.project_id
  region                     = var.region
  variant                    = local.variant
  artifact_registry_location = var.artifact_registry_location
  training_bucket_location   = var.region
  create_vpc                 = true
  subnet_cidr                = var.subnet_cidr
}

module "grpc_model_cluster" {
  source          = "../modules/gke_service"
  project_id      = var.project_id
  region          = var.region
  cluster_name    = "${module.common.prefix}-grpc-cluster"
  network_name    = module.common.network_name
  subnetwork_name = module.common.subnetwork_name
}

module "coordinator" {
  source                = "../modules/cloud_run_service"
  project_id            = var.project_id
  region                = var.region
  service_name          = "${module.common.prefix}-coordinator"
  image                 = var.coordinator_image
  service_account_email = module.common.coordinator_service_account_email
  env_vars = {
    COORDINATOR_BIND   = "0.0.0.0:8080"
    GRPC_INFERENCE_URL = var.gke_grpc_endpoint
    TRAINING_DATA_BUCKET = module.common.training_bucket_name
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
