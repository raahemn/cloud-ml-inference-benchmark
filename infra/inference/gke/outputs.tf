output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "cluster_name" {
  value = module.cluster.name
}

output "cluster_location" {
  value = module.cluster.location
}

output "artifact_registry_repository" {
  value = module.common.artifact_registry_repository_id
}

output "coordinator_service_account_email" {
  value = module.common.coordinator_service_account_email
}

output "grpc_model_service_account_email" {
  value = module.common.grpc_model_service_account_email
}
