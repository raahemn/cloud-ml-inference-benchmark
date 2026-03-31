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

variable "model_bucket_name" {
  type    = string
  default = "cmpt756-resnet-models"
}

variable "subnet_cidr" {
  type    = string
  default = "10.22.0.0/24"
}
