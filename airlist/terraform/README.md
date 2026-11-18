# Apply the production infrastructure to Google Cloud

> This guide predates the current deployment. Terraform now uses the existing
> `nglob-db` instance and a GCS state backend. Check the current configuration
> and state before following the bootstrap instructions below. The frontend is
> hosted on Vercel and should not be deployed to Cloud Run.

Terraform runs from `terraform/environments/production`. It creates the VPC,
Artifact Registry, Cloud SQL, Redis, Secret Manager, storage bucket, Cloud Run
services in the project named by `project_id`. A Git push does
not run Terraform in the current setup. `.github/workflows/deploy.yml` only
builds images and updates existing Cloud Run services.

## Before the first apply

1. Choose the Google Cloud project in the console, link a billing account, and
   use an account allowed to enable APIs and create the resources above. The
   `project_id` in `terraform.tfvars.example` is an example; verify the actual
   project ID in **Project info** in the console.
2. Use a machine with Terraform, Docker, and the Google Cloud CLI, or use
   Google Cloud Shell with Terraform and Docker available. On a local machine,
   authenticate with `gcloud auth login` and
   `gcloud auth application-default login`. Cloud Shell provides application
   default credentials from its signed-in session.
3. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in the real
   values. The latter is ignored by Git. Use a globally unique
   `gcs_bucket_name`. Do not place production secrets in a commit or shell
   history. Terraform state and saved plan files contain secret values; keep
   them private.
4. Check whether the named storage bucket and any other named resources already
   exist. Existing resources must be imported into this Terraform state before
   the full apply, or given different names. For example, if the bucket exists
   **in the same project**, run this after `terraform init`:

   ```sh
   terraform import module.storage.google_storage_bucket.uploads nglob-storage
   ```

## Bootstrap, then apply

Run from `terraform/environments/production`:

```sh
gcloud config set project YOUR_PROJECT_ID
terraform init
terraform validate
terraform plan -target=module.artifact_registry -out=registry.tfplan
terraform apply registry.tfplan
```

The targeted apply enables required APIs and creates Artifact Registry. It is
only a bootstrap step. Terraform's Cloud Run services refer to images in that
registry, so push both images before the full apply. Run the following from
the repository directory that contains `backend_alexis/` and `nglobi/`:

```sh
gcloud auth configure-docker europe-west1-docker.pkg.dev
docker build -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/nglob-prod-registry/backend:latest -f backend_alexis/Dockerfile backend_alexis
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/nglob-prod-registry/backend:latest
docker build -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/nglob-prod-registry/frontend:latest -f nglobi/Dockerfile nglobi
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/nglob-prod-registry/frontend:latest
```

The frontend uses Next.js environment values during its build. Set its
production `API_URL` and `NEXT_PUBLIC_*` values in the build environment and
check `nglobi/next.config.mjs` before using the frontend image in production.

Return to `terraform/environments/production`:

```sh
terraform plan -out=production.tfplan
terraform show production.tfplan
terraform apply production.tfplan
terraform output
```

Review the plan before applying: this creates billable services. Cloud Run
creation does not run database migrations. Run the backend's Prisma migrations
against Cloud SQL before serving real traffic. Configure DNS for the domains in
`terraform.tfvars` after the Cloud Run URLs appear in `terraform output`.

## State and future Git pushes

The current configuration starts with **local Terraform state**. Back it up
privately immediately. Create a separate, versioned GCS bucket for Terraform
state, uncomment the `backend "gcs"` block in `main.tf`, set its bucket name,
and run `terraform init -migrate-state`. The state bucket must already exist;
it is separate from the application upload bucket. Do not delete the local
state until migration succeeds.

The outer Git repository here points to `HYYPNNOSS/homesketches` on `master`.
`backend_alexis` and `nglobi` each have their own `main` branch and remote.
The Terraform directory and `.github/workflows/deploy.yml` are currently
untracked in the outer repository. The workflow watches `main`, so pushing
the outer `master` branch does not trigger it. To use that workflow, put the
workflow, Terraform, and both Docker build contexts in one deployment repo,
commit them on its `main` branch, and configure its GitHub secrets. The
`GCP_SA_KEY` secret must contain the **raw JSON** service account key, as
expected by `google-github-actions/auth`; do not base64 encode it. Prefer
Workload Identity Federation before enabling automatic production deploys.

Even after that, the workflow only publishes images and deploys Cloud Run.
Infrastructure changes still need a deliberate `terraform plan` and
`terraform apply`, or a separate reviewed Terraform workflow.

References: [Terraform authentication](https://docs.cloud.google.com/docs/terraform/authentication),
[GCS state backend](https://developer.hashicorp.com/terraform/language/backend/gcs),
[Cloud Run deployment](https://docs.cloud.google.com/run/docs/deploying).
