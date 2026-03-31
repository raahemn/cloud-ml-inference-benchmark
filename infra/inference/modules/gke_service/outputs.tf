output "name" {
  value = google_container_cluster.cluster.name
}

output "endpoint" {
  value = google_container_cluster.cluster.endpoint
}

output "location" {
  value = google_container_cluster.cluster.location
}
