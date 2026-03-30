output "prefix" {
  value = "inference-${var.variant}"
}

output "artifact_registry_repository_id" {
  value = google_artifact_registry_repository.images.repository_id
}

output "artifact_registry_repository_name" {
  value = google_artifact_registry_repository.images.name
}

output "coordinator_service_account_email" {
  value = google_service_account.coordinator.email
}

output "grpc_model_service_account_email" {
  value = google_service_account.grpc_model.email
}

output "coordinator_secret_id" {
  value = google_secret_manager_secret.coordinator_env.secret_id
}

output "grpc_model_secret_id" {
  value = google_secret_manager_secret.grpc_model_env.secret_id
}

output "training_bucket_name" {
  value = google_storage_bucket.training_data.name
}

output "network_name" {
  value = var.create_vpc ? google_compute_network.inference[0].name : null
}

output "subnetwork_name" {
  value = var.create_vpc ? google_compute_subnetwork.inference[0].name : null
}
