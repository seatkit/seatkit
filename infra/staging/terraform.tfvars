# GCP Project
project_id = "seatkit-dev"
region     = "europe-west1"

# CI/CD
ci_service_account_email = "seatkit-ci@seatkit-dev.iam.gserviceaccount.com"

# Secret Manager secret IDs (the secret names, NOT the secret values)
secret_ids = {
  database_url             = "seatkit-dev-database-url"
  better_auth_secret       = "seatkit-dev-better-auth-secret"
  admin_email              = "seatkit-dev-admin-email"
  admin_password           = "seatkit-dev-admin-password"
  supabase_url             = "seatkit-dev-supabase-url"
  supabase_publishable_key = "seatkit-dev-supabase-publishable-key"
  supabase_secret_key      = "seatkit-dev-supabase-secret-key"
}
