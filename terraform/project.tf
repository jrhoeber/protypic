locals {
  required_apis = [
    "run.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "compute.googleapis.com",
    "certificatemanager.googleapis.com",
    "dns.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudscheduler.googleapis.com",
    "identitytoolkit.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each                   = toset(local.required_apis)
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_artifact_registry_repository" "web" {
  location      = var.region
  repository_id = "protypic"
  description   = "Container images for protypic"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled]
}
