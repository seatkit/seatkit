# GCP Project
project_id = "REPLACE_WITH_PROJECT_ID"
region     = "europe-west1"

# DNS
dns_zone_name = "REPLACE_WITH_DNS_ZONE_NAME"

# Secret Manager secret IDs (the secret names, NOT the secret values)
secret_ids = {
  database_url       = "seatkit-staging-database-url"
  better_auth_secret = "seatkit-staging-better-auth-secret"
  admin_email        = "seatkit-staging-admin-email"
  admin_password     = "seatkit-staging-admin-password"
}
