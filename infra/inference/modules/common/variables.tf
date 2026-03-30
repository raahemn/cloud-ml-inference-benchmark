variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "variant" {
  type = string
}

variable "artifact_registry_location" {
  type    = string
  default = "northamerica-northeast1"
}

variable "create_vpc" {
  type    = bool
  default = false
}

variable "subnet_cidr" {
  type    = string
  default = "10.20.0.0/24"
}

variable "training_bucket_location" {
  type    = string
  default = "northamerica-northeast1"
}
