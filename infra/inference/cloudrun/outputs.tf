output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "coordinator_service_url" {
  value = module.coordinator.uri
}

output "grpc_model_service_url" {
  value = module.grpc_model.uri
}

output "artifact_registry_repository" {
  value = module.common.artifact_registry_repository_id
}
