locals {
  variant = "gke"
}

module "common" {
  source                     = "../modules/common"
  project_id                 = var.project_id
  region                     = var.region
  variant                    = local.variant
  artifact_registry_location = var.artifact_registry_location
  training_bucket_location   = var.region
  model_bucket_name          = var.model_bucket_name
  create_vpc                 = true
  subnet_cidr                = var.subnet_cidr
}

module "cluster" {
  source          = "../modules/gke_service"
  project_id      = var.project_id
  region          = var.region
  cluster_name    = "${module.common.prefix}-cluster"
  network_name    = module.common.network_name
  subnetwork_name = module.common.subnetwork_name
}

resource "google_compute_global_address" "lb_ip" {
  project = var.project_id
  name    = "${module.common.prefix}-lb-ip"
}

resource "google_service_account_iam_member" "coordinator_workload_identity" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${module.common.coordinator_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/coordinator-ksa]"
}

resource "google_service_account_iam_member" "grpc_model_workload_identity" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${module.common.grpc_model_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/grpc-model-ksa]"
}

resource "google_service_account_iam_member" "training_workload_identity" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${module.common.training_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/training-service-ksa]"
}

resource "google_storage_bucket_iam_member" "grpc_model_bucket_reader" {
  bucket = var.model_bucket_name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${module.common.grpc_model_service_account_email}"
}
