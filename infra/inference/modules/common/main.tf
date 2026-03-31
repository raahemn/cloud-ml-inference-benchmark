locals {
  prefix = "inference-${var.variant}"

  required_services = [
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudtrace.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each           = toset(local.required_services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "images" {
  project       = var.project_id
  location      = var.artifact_registry_location
  repository_id = "${local.prefix}-images"
  format        = "DOCKER"
  description   = "Container images for the ${local.prefix} inference stack."

  depends_on = [google_project_service.required]
}

resource "google_service_account" "coordinator" {
  project      = var.project_id
  account_id   = substr(replace("${local.prefix}-coord-sa", "_", "-"), 0, 30)
  display_name = "${local.prefix} coordinator"
}

resource "google_service_account" "grpc_model" {
  project      = var.project_id
  account_id   = substr(replace("${local.prefix}-grpc-sa", "_", "-"), 0, 30)
  display_name = "${local.prefix} grpc model"
}

resource "google_service_account" "training" {
  project      = var.project_id
  account_id   = substr(replace("${local.prefix}-train-sa", "_", "-"), 0, 30)
  display_name = "${local.prefix} training service"
}

resource "google_secret_manager_secret" "coordinator_env" {
  project   = var.project_id
  secret_id = "${local.prefix}-coordinator-env"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "grpc_model_env" {
  project   = var.project_id
  secret_id = "${local.prefix}-grpc-model-env"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "training_trigger" {
  project = var.project_id
  name    = "${local.prefix}-training-trigger"

  depends_on = [google_project_service.required]
}

resource "google_pubsub_subscription" "training_trigger" {
  project = var.project_id
  name    = "${local.prefix}-training-trigger-sub"
  topic   = google_pubsub_topic.training_trigger.name

  ack_deadline_seconds       = 600
  message_retention_duration = "86400s"
}

resource "google_storage_bucket" "training_data" {
  project                     = var.project_id
  name                        = "${local.prefix}-training-data"
  location                    = var.training_bucket_location
  uniform_bucket_level_access = true

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "coordinator_training_writer" {
  bucket = google_storage_bucket.training_data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.coordinator.email}"
}

resource "google_storage_bucket_iam_member" "grpc_model_training_reader" {
  bucket = google_storage_bucket.training_data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.grpc_model.email}"
}

resource "google_storage_bucket_iam_member" "training_data_object_admin" {
  bucket = google_storage_bucket.training_data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.training.email}"
}

resource "google_storage_bucket_iam_member" "training_model_bucket_admin" {
  bucket = var.model_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.training.email}"
}

resource "google_pubsub_topic_iam_member" "coordinator_training_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.training_trigger.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.coordinator.email}"
}

resource "google_pubsub_subscription_iam_member" "training_subscriber" {
  project      = var.project_id
  subscription = google_pubsub_subscription.training_trigger.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.training.email}"
}

resource "google_compute_network" "inference" {
  count                   = var.create_vpc ? 1 : 0
  project                 = var.project_id
  name                    = "${local.prefix}-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "inference" {
  count         = var.create_vpc ? 1 : 0
  project       = var.project_id
  name          = "${local.prefix}-subnet"
  region        = var.region
  network       = google_compute_network.inference[0].id
  ip_cidr_range = var.subnet_cidr
}
