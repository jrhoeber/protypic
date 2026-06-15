resource "google_storage_bucket" "prototypes" {
  name                        = "${var.project_id}-prototypes"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  # Prototype objects are streamed to viewers by the Cloud Run service, which
  # authenticates to GCS via its service account. The bucket stays fully
  # private — direct anonymous reads are denied.
  public_access_prevention = "enforced"

  cors {
    origin          = ["https://${var.view_subdomain}"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  # No age-based lifecycle. Prototypes are pruned by the hourly cron sweep
  # (apps/web/app/api/cron/sweep) using each prototype's expiresAt. A blanket
  # "delete at age=100d" rule would silently destroy user-selected "Never
  # expire" prototypes — the dashboard would still show them as live but the
  # underlying objects would be gone. Lifetime is owned by Firestore.

  depends_on = [google_project_service.enabled]
}
