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

variable "training_service_image" {
  type = string
}

variable "model_bucket_name" {
  type    = string
  default = "cmpt756-resnet-models"
}

variable "training_threshold" {
  type    = number
  default = 100
}
