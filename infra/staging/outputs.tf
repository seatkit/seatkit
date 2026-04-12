output "api_service_url" {
  description = "Cloud Run URL for the API service"
  value       = google_cloud_run_v2_service.api.uri
}

output "web_service_url" {
  description = "Cloud Run URL for the web service"
  value       = google_cloud_run_v2_service.web.uri
}

output "artifact_registry_url" {
  description = "Artifact Registry URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.seatkit.repository_id}"
}

output "api_staging_domain" {
  description = "Custom staging domain for the API"
  value       = var.api_staging_domain
}

output "web_staging_domain" {
  description = "Custom staging domain for the web app"
  value       = var.web_staging_domain
}

output "cloud_run_service_account" {
  description = "Service account email used by Cloud Run services"
  value       = google_service_account.cloud_run.email
}
