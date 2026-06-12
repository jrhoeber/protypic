resource "google_compute_global_address" "lb" {
  name = "protypic-lb-ip"

  depends_on = [google_project_service.enabled]
}

# Cloud Run backend (portal + API on var.domain, prototype gate + streaming on
# var.view_subdomain). The same Cloud Run service is served on both hosts; app
# middleware enforces that the two hostnames serve disjoint route sets so that
# portal cookies never reach prototype origins.
resource "google_compute_region_network_endpoint_group" "web_neg" {
  name                  = "protypic-web-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }

  depends_on = [google_project_service.enabled]
}

resource "google_compute_backend_service" "web" {
  name                  = "protypic-web-backend"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.web_neg.id
  }
}

resource "google_compute_url_map" "lb" {
  name            = "protypic-url-map"
  default_service = google_compute_backend_service.web.id
}

resource "google_compute_managed_ssl_certificate" "lb" {
  name = "protypic-cert-v2"
  managed {
    domains = [var.domain, var.view_subdomain]
  }

  depends_on = [google_project_service.enabled]

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_target_https_proxy" "lb" {
  name             = "protypic-https-proxy"
  url_map          = google_compute_url_map.lb.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "protypic-https"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.lb.id
}

# HTTP → HTTPS redirect.
resource "google_compute_url_map" "redirect" {
  name = "protypic-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }

  depends_on = [google_project_service.enabled]
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "protypic-http-proxy"
  url_map = google_compute_url_map.redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "protypic-http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.redirect.id
}
