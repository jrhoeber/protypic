resource "google_compute_global_address" "lb" {
  name = "protypic-lb-ip"

  depends_on = [google_project_service.enabled]
}

# Cloud CDN signing key (HMAC) — attached to the backend bucket for signed cookies.
resource "google_compute_backend_bucket_signed_url_key" "cdn_key" {
  name           = "protypic-cdn-key"
  backend_bucket = google_compute_backend_bucket.prototypes.name
  key_value      = random_id.cdn_signing_key.b64_url
}

resource "google_compute_backend_bucket" "prototypes" {
  name                    = "protypic-prototypes-backend"
  bucket_name             = google_storage_bucket.prototypes.name
  enable_cdn              = true
  compression_mode        = "AUTOMATIC"
  edge_security_policy    = null
  custom_response_headers = ["Cache-Control: public, max-age=31536000, immutable"]

  depends_on = [google_project_service.enabled]

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    client_ttl                   = 3600
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    serve_while_stale            = 0
    signed_url_cache_max_age_sec = 600
  }
}

# Cloud Run backend (the gate, portal, and API).
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

# URL map:
#   cdn.protypic.ai/*  → backend bucket (signed cookie required)
#   protypic.ai/*      → Cloud Run service
resource "google_compute_url_map" "lb" {
  name            = "protypic-url-map"
  default_service = google_compute_backend_service.web.id

  host_rule {
    hosts        = [var.domain]
    path_matcher = "web"
  }
  host_rule {
    hosts        = [var.cdn_subdomain]
    path_matcher = "cdn"
  }

  path_matcher {
    name            = "web"
    default_service = google_compute_backend_service.web.id
  }

  path_matcher {
    name            = "cdn"
    default_service = google_compute_backend_bucket.prototypes.id
    path_rule {
      paths   = ["/p/*"]
      service = google_compute_backend_bucket.prototypes.id
    }
  }
}

resource "google_compute_managed_ssl_certificate" "lb" {
  name = "protypic-cert"
  managed {
    domains = [var.domain, var.cdn_subdomain]
  }

  depends_on = [google_project_service.enabled]
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
