output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "coordinator_service_name" {
  value = module.coordinator.name
}

output "coordinator_service_url" {
  value = module.coordinator.uri
}

output "training_service_url" {
  value = module.training_service.uri
}

output "grpc_cluster_name" {
  value = local.grpc_cluster_name
}

output "grpc_cluster_location" {
  value = local.grpc_cluster_location
}

output "grpc_cluster_endpoint" {
  value = local.grpc_cluster_endpoint
}

output "artifact_registry_repository" {
  value = module.common.artifact_registry_repository_id
}

output "training_bucket_name" {
  value = module.common.training_bucket_name
}

output "training_trigger_topic_id" {
  value = module.common.training_trigger_topic_id
}

output "training_trigger_subscription_name" {
  value = module.common.training_trigger_subscription_name
}
