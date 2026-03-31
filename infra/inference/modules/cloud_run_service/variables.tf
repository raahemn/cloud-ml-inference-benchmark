variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "service_name" {
  type = string
}

variable "image" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "allow_unauthenticated" {
  type    = bool
  default = true
}

variable "memory_limit" {
  type    = string
  default = "512Mi"
}

variable "cpu_limit" {
  type    = string
  default = null
}

variable "cpu_idle" {
  type    = bool
  default = true
}

variable "min_instance_count" {
  type    = number
  default = 0
}

variable "max_instance_count" {
  type    = number
  default = null
}

variable "max_instance_request_concurrency" {
  type    = number
  default = 80
}
