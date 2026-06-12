resource "google_cloud_run_v2_service" "web" {
  name     = "protypic-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  # After bootstrap, CI owns the image tag. Without this, every `terraform apply`
  # would revert Cloud Run to whatever `var.image` says (typically `:bootstrap`).
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

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
        name  = "PORTAL_HOST"
        value = var.domain
      }
      env {
        name  = "VIEW_HOST"
        value = var.view_subdomain
      }
      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = "https://${var.domain}"
      }

      env {
        name = "COOKIE_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.cookie_secret.secret_id
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
    google_secret_manager_secret_iam_member.web_cookie_secret,
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

# Public invokes via the LB. Ingress restriction (INTERNAL_LOAD_BALANCER, above)
# still blocks the raw *.run.app URL from the internet — this only allows traffic
# that came through the LB to be served.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
