output "lb_ip" {
  value       = google_compute_global_address.lb.address
  description = "Point your domain's A record here (handled automatically if using the managed zone)."
}

output "cloud_run_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "artifact_registry" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}"
}

output "dns_nameservers" {
  value       = google_dns_managed_zone.main.name_servers
  description = "Set these as the nameservers for protypic.ai at your registrar."
}

output "workload_identity_provider" {
  value       = var.github_repo == "" ? null : google_iam_workload_identity_pool_provider.github[0].name
  description = "Use this as the `workload_identity_provider` in GitHub Actions auth."
}

output "deployer_service_account" {
  value = var.github_repo == "" ? null : google_service_account.deployer[0].email
}
