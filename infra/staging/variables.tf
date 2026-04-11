# --- Project ---
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "europe-west1"
}

# --- Artifact Registry ---
variable "artifact_registry_id" {
  description = "Artifact Registry repository ID"
  type        = string
  default     = "seatkit"
}

# --- Cloud Run ---
variable "api_service_name" {
  description = "Cloud Run service name for the API"
  type        = string
  default     = "seatkit-api"
}

variable "web_service_name" {
  description = "Cloud Run service name for the web app"
  type        = string
  default     = "seatkit-web"
}

variable "api_image_tag" {
  description = "API container image tag (updated by CI/CD)"
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  description = "Web container image tag (updated by CI/CD)"
  type        = string
  default     = "latest"
}

# --- Domains ---
variable "api_staging_domain" {
  description = "Custom domain for the staging API"
  type        = string
  default     = "api-staging.seatkit.dev"
}

variable "web_staging_domain" {
  description = "Custom domain for the staging web app"
  type        = string
  default     = "staging.seatkit.dev"
}

# --- Secrets ---
variable "secret_ids" {
  description = "Map of secret names to their Secret Manager secret IDs"
  type = object({
    database_url       = string
    better_auth_secret = string
    admin_email        = string
    admin_password     = string
  })
}
