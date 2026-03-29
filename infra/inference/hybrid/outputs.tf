output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "coordinator_service_name" {
  value = module.coordinator.name
}

output "coordinator_service_url" {
  value = module.coordinator.uri
}

output "grpc_cluster_name" {
  value = module.grpc_model_cluster.name
}

output "artifact_registry_repository" {
  value = module.common.artifact_registry_repository_id
}
