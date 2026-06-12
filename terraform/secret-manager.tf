resource "random_password" "api_token_pepper" {
  length  = 48
  special = false
}

resource "random_password" "cookie_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "api_token_pepper" {
  secret_id = "protypic-api-token-pepper"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "api_token_pepper" {
  secret      = google_secret_manager_secret.api_token_pepper.id
  secret_data = random_password.api_token_pepper.result
}

# HMAC key for the prototype unlock cookie (see apps/web/lib/prototype-session.ts).
# Rotating this invalidates all outstanding unlock sessions.
resource "google_secret_manager_secret" "cookie_secret" {
  secret_id = "protypic-cookie-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "cookie_secret" {
  secret      = google_secret_manager_secret.cookie_secret.id
  secret_data = random_password.cookie_secret.result
}
