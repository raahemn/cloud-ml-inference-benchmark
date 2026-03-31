output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}

output "cluster_name" {
  value = module.cluster.name
}

output "cluster_location" {
  value = module.cluster.location
}

output "cluster_endpoint" {
  value = module.cluster.endpoint
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

output "training_service_account_email" {
  value = module.common.training_service_account_email
}

output "training_bucket_name" {
  value = module.common.training_bucket_name
}

output "training_trigger_topic_name" {
  value = module.common.training_trigger_topic_name
}

output "training_trigger_topic_id" {
  value = module.common.training_trigger_topic_id
}

output "training_trigger_subscription_name" {
  value = module.common.training_trigger_subscription_name
}

output "network_name" {
  value = module.common.network_name
}

output "subnetwork_name" {
  value = module.common.subnetwork_name
}
