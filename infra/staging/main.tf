# =============================================================================
# Artifact Registry
# =============================================================================

resource "google_artifact_registry_repository" "seatkit" {
  location      = var.region
  repository_id = var.artifact_registry_id
  format        = "DOCKER"
  description   = "SeatKit Docker images"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
}

# =============================================================================
# Service Account (least-privilege for Cloud Run)
# =============================================================================

resource "google_service_account" "cloud_run" {
  account_id   = "seatkit-cloud-run"
  display_name = "SeatKit Cloud Run Service Account"
}

# Allow Cloud Run SA to access secrets (per-secret, not project-wide)
resource "google_secret_manager_secret_iam_member" "database_url" {
  secret_id = var.secret_ids.database_url
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "better_auth_secret" {
  secret_id = var.secret_ids.better_auth_secret
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "admin_email" {
  secret_id = var.secret_ids.admin_email
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "admin_password" {
  secret_id = var.secret_ids.admin_password
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Allow Cloud Run SA to pull images from Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cloud_run_reader" {
  location   = google_artifact_registry_repository.seatkit.location
  repository = google_artifact_registry_repository.seatkit.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Allow CI service account to push images to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "ci_writer" {
  location   = google_artifact_registry_repository.seatkit.location
  repository = google_artifact_registry_repository.seatkit.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.ci_service_account_email}"
}

# Allow CI service account to deploy to Cloud Run
resource "google_project_iam_member" "ci_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${var.ci_service_account_email}"
}

# Allow CI service account to act as the Cloud Run service account
resource "google_service_account_iam_member" "ci_act_as_cloud_run" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.ci_service_account_email}"
}

# =============================================================================
# Cloud Run — API Service
# =============================================================================

resource "google_cloud_run_v2_service" "api" {
  name                = var.api_service_name
  location            = var.region
  deletion_protection = false

  template {
    service_account  = google_service_account.cloud_run.email
    session_affinity = true    # D-09: WebSocket session stickiness
    timeout          = "3600s" # D-09: 60-min WebSocket timeout

    scaling {
      min_instance_count = 0 # D-11: scale to zero
      max_instance_count = 2
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.seatkit.repository_id}/api:${var.api_image_tag}"

      ports {
        container_port = 3001
      }

      resources {
        limits = {
          cpu    = "1"     # D-11: 1 CPU
          memory = "512Mi" # D-11: 512Mi memory
        }
      }

      # D-18: Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids.database_url
            version = "latest"
          }
        }
      }

      env {
        name = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids.better_auth_secret
            version = "latest"
          }
        }
      }

      env {
        name = "ADMIN_EMAIL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids.admin_email
            version = "latest"
          }
        }
      }

      env {
        name = "ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids.admin_password
            version = "latest"
          }
        }
      }

      # D-19: Non-sensitive config
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      env {
        name  = "LOG_FORMAT"
        value = "gcp"
      }
      env {
        name  = "CORS_ORIGIN"
        value = "https://${var.web_staging_domain}"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image, # Image updated by CI/CD, not Terraform
    ]
  }
}

# Allow unauthenticated invocations (public staging API)
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Cloud Run — Web Service
# =============================================================================

resource "google_cloud_run_v2_service" "web" {
  name                = var.web_service_name
  location            = var.region
  deletion_protection = false

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0 # D-11: scale to zero
      max_instance_count = 2
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.seatkit.repository_id}/web:${var.web_image_tag}"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Non-sensitive config
      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated invocations (public staging web)
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  name     = google_cloud_run_v2_service.web.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Domain Mapping (uses Cloud Run v1 API — no v2 equivalent)
# =============================================================================

resource "google_cloud_run_domain_mapping" "api_staging" {
  location = var.region
  name     = var.api_staging_domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.api.name
  }
}

resource "google_cloud_run_domain_mapping" "web_staging" {
  location = var.region
  name     = var.web_staging_domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.web.name
  }
}

# =============================================================================
# DNS Records
# =============================================================================
# DNS is managed in Cloudflare (not Google Cloud DNS).
# Create these CNAME records manually in Cloudflare dashboard (proxy OFF / DNS only):
#   api-staging.seatkit.dev → ghs.googlehosted.com
#   staging.seatkit.dev     → ghs.googlehosted.com
