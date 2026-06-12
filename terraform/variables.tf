variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  description = "Primary region for Cloud Run and GCS."
  default     = "us-central1"
}

variable "domain" {
  type        = string
  description = "Primary public domain for the portal + API, e.g. protypic.ai."
  default     = "protypic.ai"
}

variable "view_subdomain" {
  type        = string
  description = "Origin-isolated host that serves user-uploaded prototype content. MUST be a different origin from var.domain so portal cookies are not sent to prototype HTML/JS."
  default     = "view.protypic.ai"
}

variable "image" {
  type        = string
  description = "Container image for Cloud Run, e.g. us-central1-docker.pkg.dev/PROJECT/protypic/web:latest."
}

variable "github_repo" {
  type        = string
  description = "GitHub repo in 'owner/name' form, for Workload Identity Federation."
  default     = ""
}
