locals {
  variant = "gke"
}

module "common" {
  source                     = "../modules/common"
  project_id                 = var.project_id
  region                     = var.region
  variant                    = local.variant
  artifact_registry_location = var.artifact_registry_location
  create_vpc                 = true
  subnet_cidr                = var.subnet_cidr
}

module "cluster" {
  source          = "../modules/gke_service"
  project_id      = var.project_id
  region          = var.region
  cluster_name    = "${module.common.prefix}-cluster"
  network_name    = module.common.network_name
  subnetwork_name = module.common.subnetwork_name
}

resource "google_compute_global_address" "lb_ip" {
  project = var.project_id
  name    = "${module.common.prefix}-lb-ip"
}
