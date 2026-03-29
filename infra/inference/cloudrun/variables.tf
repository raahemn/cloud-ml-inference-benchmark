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
