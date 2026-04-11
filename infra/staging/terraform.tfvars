# GCP Project
project_id = "seatkit-dev"
region     = "europe-west1"

# Secret Manager secret IDs (the secret names, NOT the secret values)
secret_ids = {
  database_url       = "seatkit-dev-database-url"
  better_auth_secret = "seatkit-dev-better-auth-secret"
  admin_email        = "seatkit-dev-admin-email"
  admin_password     = "seatkit-dev-admin-password"
}
