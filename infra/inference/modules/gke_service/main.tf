resource "google_container_cluster" "cluster" {
  project                  = var.project_id
  name                     = var.cluster_name
  location                 = var.region
  enable_autopilot         = true
  deletion_protection      = false
  networking_mode          = "VPC_NATIVE"
  network                  = var.network_name
  subnetwork               = var.subnetwork_name

  ip_allocation_policy {}

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}
