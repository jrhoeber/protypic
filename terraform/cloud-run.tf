resource "google_cloud_run_v2_service" "web" {
  name     = "protypic-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.web.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCS_PROTOTYPES_BUCKET"
        value = google_storage_bucket.prototypes.name
      }
      env {
        name  = "CDN_BASE_URL"
        value = "https://${var.cdn_subdomain}"
      }
      env {
        name  = "CDN_SIGNING_KEY_NAME"
        value = "protypic-cdn-key"
      }
      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = "https://${var.domain}"
      }

      env {
        name = "CDN_SIGNING_KEY_VALUE"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cdn_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "API_TOKEN_PEPPER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_token_pepper.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.enabled,
    google_secret_manager_secret_iam_member.web_cdn_key,
    google_secret_manager_secret_iam_member.web_pepper,
  ]
}

resource "google_cloud_scheduler_job" "sweep" {
  name        = "protypic-sweep-expired"
  description = "Hourly sweep of expired prototypes."
  schedule    = "0 * * * *"
  time_zone   = "Etc/UTC"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.web.uri}/api/cron/sweep"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.web.uri
    }
  }

  depends_on = [google_project_service.enabled]
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}
