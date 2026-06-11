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
  description = "Primary public domain, e.g. protypic.ai."
  default     = "protypic.ai"
}

variable "cdn_subdomain" {
  type        = string
  description = "Subdomain used for static asset CDN, e.g. cdn.protypic.ai."
  default     = "cdn.protypic.ai"
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
