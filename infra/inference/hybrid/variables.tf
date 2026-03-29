variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "northamerica-northeast1"
}

variable "artifact_registry_location" {
  type    = string
  default = "northamerica-northeast1"
}

variable "coordinator_image" {
  type = string
}

variable "grpc_model_image" {
  type = string
}

variable "gke_grpc_endpoint" {
  type        = string
  description = "The reachable gRPC endpoint for the model service once it is deployed on GKE."
}

variable "subnet_cidr" {
  type    = string
  default = "10.21.0.0/24"
}
