resource "google_storage_bucket" "prototypes" {
  name                        = "${var.project_id}-prototypes"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  public_access_prevention = "enforced"

  cors {
    origin          = ["https://${var.domain}"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 100 # safety net — anything older than 100 days is reaped
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.enabled]
}
