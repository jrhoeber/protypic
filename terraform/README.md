# Terraform — protypic infrastructure

Provisions everything: Cloud Run, Firestore, GCS, Cloud CDN + signed cookies, Cloud DNS, Cloud Scheduler, Secret Manager, and (optionally) Workload Identity Federation for GitHub Actions.

## One-time bootstrap

1. Create the project (or pick an existing one) and link billing.
2. Create the Terraform state bucket manually (it can't manage itself):
   ```bash
   PROJECT=your-project-id
   gcloud config set project "$PROJECT"
   gsutil mb -l us-central1 "gs://$PROJECT-tfstate"
   gsutil versioning set on "gs://$PROJECT-tfstate"
   ```
3. Enable the [Firebase Auth Google provider](https://console.firebase.google.com) for the project (one-time, click-ops — Terraform doesn't manage this cleanly).
4. Bootstrap a placeholder image so the Cloud Run resource has something to deploy:
   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   docker pull gcr.io/cloudrun/placeholder
   docker tag gcr.io/cloudrun/placeholder \
     "us-central1-docker.pkg.dev/$PROJECT/protypic/web:bootstrap"
   docker push "us-central1-docker.pkg.dev/$PROJECT/protypic/web:bootstrap"
   ```

## Apply

```bash
terraform init -backend-config="bucket=$PROJECT-tfstate" -backend-config="prefix=protypic"
terraform apply \
  -var "project_id=$PROJECT" \
  -var "image=us-central1-docker.pkg.dev/$PROJECT/protypic/web:bootstrap" \
  -var "github_repo=<owner>/<repo>"   # omit to skip WIF setup
```

## If you already created some resources by hand

The bootstrap step in this README has you create the Artifact Registry repo manually so you can push a placeholder image. Terraform will then fail with `Error 409: the repository already exists`. Import it into state before re-applying:

```bash
terraform import \
  -var "project_id=$PROJECT" \
  -var "image=us-central1-docker.pkg.dev/$PROJECT/protypic/web:bootstrap" \
  google_artifact_registry_repository.web \
  "projects/$PROJECT/locations/us-central1/repositories/protypic"
```

Same pattern applies to anything else you provisioned manually before running Terraform.

## After apply
1. Point `protypic.ai` at the nameservers shown in the `dns_nameservers` output (at your registrar).
2. Wait for the managed cert to provision (can take 15–60 minutes).
3. Push a real image via GitHub Actions, then re-apply with the new `image` var (or just let the CI workflow update Cloud Run directly).

## What's NOT in here

- Firebase Auth provider config (manual, one-time).
- Cloud Armor / WAF — add if abuse appears.
- Per-environment workspaces (use `terraform workspace` or separate state prefixes if you want staging).
