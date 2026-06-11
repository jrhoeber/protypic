resource "random_id" "cdn_signing_key" {
  byte_length = 16 # 128-bit HMAC key; exposed as .b64_url (RFC 4648 §5)
}

resource "random_password" "api_token_pepper" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "cdn_key" {
  secret_id = "protypic-cdn-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "cdn_key" {
  secret      = google_secret_manager_secret.cdn_key.id
  secret_data = random_id.cdn_signing_key.b64_url
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
