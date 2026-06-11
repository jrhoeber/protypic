resource "google_dns_managed_zone" "main" {
  name        = "protypic"
  dns_name    = "${var.domain}."
  description = "protypic.ai"
  visibility  = "public"

  depends_on = [google_project_service.enabled]
}

resource "google_dns_record_set" "apex" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.main.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb.address]
}

resource "google_dns_record_set" "cdn" {
  name         = "${var.cdn_subdomain}."
  managed_zone = google_dns_managed_zone.main.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb.address]
}
