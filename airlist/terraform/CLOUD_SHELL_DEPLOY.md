# Deploy this repository from Google Cloud Console

> This guide predates the current deployment. The registry, network, Redis,
> secrets, and GCS state backend have already been created. The existing
> `nglob-db` instance is suspended. Do not repeat the first-apply steps against
> a new state file; inspect the current Terraform state first. The frontend is
> hosted on Vercel, so do not follow the frontend Cloud Run steps below.

This guide uses the files currently in `/home/hypnos/Desktop/airlist` and the
Google Cloud project `project-a7a3fa03-8eb7-4ee7-b96`. Run the commands in
order. **Uploading files does not apply Terraform**; the `terraform apply`
commands below do that. The existing GitHub workflow does not apply Terraform.

The target region is `europe-west1`. The Terraform configuration creates a
network, Artifact Registry, Cloud SQL, Redis, Secret Manager secrets, a storage
bucket, and two Cloud Run services. These are billable resources.

## 1. Check the private values on this computer

The file `terraform/environments/production/terraform.tfvars` already exists
locally. It is ignored by Git and contains passwords and API keys. Open it
locally and confirm the project, bucket name, domains, and credentials. The
values sourced from the current environment files use **Stripe test keys**;
the Google Maps key is **empty**. Replace these if you expect live payments or
Maps to work. Keep this file private.

Do not upload `.env` files, Terraform state files, or saved plan files.

## 2. Make one upload archive on this computer

Open a terminal on this computer and run:

```sh
cd /home/hypnos/Desktop/airlist
tar --exclude='*/.git' \
    --exclude='*/node_modules' \
    --exclude='*/.next' \
    --exclude='*/.terraform' \
    --exclude='*/graphify-out' \
    --exclude='*.env*' \
    --exclude='*/envtxt' \
    --exclude='*/env copy*' \
    --exclude='terraform.tfvars' \
    --exclude='*.tfstate*' \
    --exclude='*.tfplan' \
    -czf /dev/shm/nglob-deploy.tar.gz terraform backend_alexis nglobi
ls -lh /dev/shm/nglob-deploy.tar.gz
```

`/dev/shm` is used because the computer's main disk was nearly full during
preparation. The archive contains the Terraform modules and both Docker build
contexts. It does **not** contain `terraform.tfvars`; upload that separately.

## 3. Upload into Cloud Shell

1. Open [Google Cloud Console](https://console.cloud.google.com/) and choose
   project `project-a7a3fa03-8eb7-4ee7-b96` in the project selector.
2. Click **Activate Cloud Shell** in the top bar. In its **More** menu, choose
   **Upload** and select `/dev/shm/nglob-deploy.tar.gz` from this computer.
3. Upload the separate file
   `/home/hypnos/Desktop/airlist/terraform/environments/production/terraform.tfvars`
   through the same menu. Cloud Shell uploads both files into your home
   directory. [Google's upload instructions](https://docs.cloud.google.com/shell/docs/uploading-and-downloading-files).
4. In the Cloud Shell terminal, run:

```sh
mkdir -p ~/nglob-deploy
tar -xzf ~/nglob-deploy.tar.gz -C ~/nglob-deploy
mv ~/terraform.tfvars ~/nglob-deploy/terraform/environments/production/terraform.tfvars
chmod 600 ~/nglob-deploy/terraform/environments/production/terraform.tfvars
cd ~/nglob-deploy/terraform/environments/production
gcloud config set project project-a7a3fa03-8eb7-4ee7-b96
gcloud config get-value project
```

The last command must print `project-a7a3fa03-8eb7-4ee7-b96`.

## 4. Install Terraform in Cloud Shell

Cloud Shell has `gcloud`, but [Terraform is no longer preinstalled](https://docs.cloud.google.com/shell/docs/release-notes).
First try `terraform version`. If it says command not found, run the official
[HashiCorp Debian/Ubuntu installation steps](https://developer.hashicorp.com/terraform/install):

```sh
sudo apt-get update
sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update
sudo apt-get install -y terraform
terraform version
```

Terraform must be version 1.9 or newer. Cloud Shell uses your Console sign-in
for Google Cloud authentication, so no service account key is needed here.

## 5. Check the project before creating resources

In Cloud Shell, still in `~/nglob-deploy/terraform/environments/production`:

```sh
gcloud billing projects describe project-a7a3fa03-8eb7-4ee7-b96 --format='value(billingEnabled)'
gcloud storage buckets list --project=project-a7a3fa03-8eb7-4ee7-b96 --format='value(name)'
gcloud run services list --project=project-a7a3fa03-8eb7-4ee7-b96 --region=europe-west1
gcloud sql instances list --project=project-a7a3fa03-8eb7-4ee7-b96
```

Billing must show `True`. Check whether the bucket named by
`gcs_bucket_name` in `terraform.tfvars` already exists. If it does, confirm it
belongs to this project. After `terraform init` in step 6, import it before
the full plan:

```sh
terraform import module.storage.google_storage_bucket.uploads BUCKET_NAME_FROM_TFVARS
```

If that bucket name belongs to another project, change `gcs_bucket_name` in
`terraform.tfvars` to a globally unique name. If Cloud Run, Cloud SQL, Redis,
or other resources from this configuration already exist, stop and import them
into the same Terraform state before applying; a new apply cannot safely take
over existing resources by name.

## 6. Create the image registry first

```sh
gcloud services enable serviceusage.googleapis.com --project=project-a7a3fa03-8eb7-4ee7-b96
terraform init
terraform validate
terraform plan -target=module.artifact_registry -out=registry.tfplan
terraform show registry.tfplan
terraform apply registry.tfplan
```

This first apply enables the configured APIs and creates Artifact Registry.
Review its plan before applying. The full apply cannot create Cloud Run until
both container images exist in that registry.

## 7. Build and push both images with Cloud Build

Run from `~/nglob-deploy/terraform/environments/production`:

```sh
gcloud builds submit --region=europe-west1 \
  --tag=europe-west1-docker.pkg.dev/project-a7a3fa03-8eb7-4ee7-b96/nglob-prod-registry/backend:latest \
  ~/nglob-deploy/backend_alexis
```

The frontend build needs its public values at **build time**. This command
reads them from the private `terraform.tfvars` and submits the existing
`nglobi/cloudbuild.yaml` without echoing the values in Cloud Shell. These are
public frontend build values, so they can be included in the browser bundle:

```sh
python3 - <<'PY'
import json
import subprocess
from pathlib import Path

values = {}
for line in Path('terraform.tfvars').read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    key, value = line.split('=', 1)
    values[key.strip()] = json.loads(value.strip())

image = f"europe-west1-docker.pkg.dev/{values['project_id']}/nglob-prod-registry/frontend:latest"
substitutions = ','.join([
    f'_IMAGE={image}',
    f"_API_URL=https://{values['backend_domain']}/api",
    f"_WS_URL=wss://{values['backend_domain']}",
    f"_STRIPE_PUBLISHABLE_KEY={values['stripe_publishable_key']}",
    f"_GOOGLE_MAPS_KEY={values['google_maps_key']}",
])
subprocess.run([
    'gcloud', 'builds', 'submit', '--region=europe-west1',
    '--config=../../../nglobi/cloudbuild.yaml',
    f'--substitutions={substitutions}',
    '../../../nglobi',
], check=True)
PY
```

Cloud Build should report success for both builds. If a build fails because
its service account lacks access, check the account with
`gcloud builds get-default-service-account --region=europe-west1` and grant
only the required permissions; see [Google's Cloud Build IAM guide](https://docs.cloud.google.com/build/docs/build-push-docker-image).

## 8. Review and apply all infrastructure

If the upload bucket already existed, complete its import from step 5 now.
Then run:

```sh
cd ~/nglob-deploy/terraform/environments/production
terraform plan -out=production.tfplan
terraform show production.tfplan
terraform apply production.tfplan
terraform output
```

Review the full plan before applying. If Terraform proposes replacing or
deleting a resource you already use, stop and inspect its state. Saved plans
and state can contain secret values; leave them in your private Cloud Shell
home directory and do not share or commit them.

Check the created resources in **Cloud Run**, **Cloud SQL**, **Memorystore**,
**Secret Manager**, **Artifact Registry**, and **Cloud Storage** in the Console.
The application still needs database migrations and DNS configuration; this
Terraform apply alone does not perform those steps.

## 9. Protect Terraform state

The current configuration uses local state in Cloud Shell. Preserve it after
the first apply. Create a separate versioned GCS bucket for Terraform state:

```sh
gcloud storage buckets create gs://project-a7a3fa03-8eb7-4ee7-b96-tfstate \
  --project=project-a7a3fa03-8eb7-4ee7-b96 \
  --location=europe-west1 \
  --uniform-bucket-level-access
gcloud storage buckets update gs://project-a7a3fa03-8eb7-4ee7-b96-tfstate --versioning
```

If the bucket name is already taken, choose another globally unique name. In
`main.tf`, replace the commented `backend "gcs"` block with this block, using
the actual state bucket name:

```hcl
backend "gcs" {
  bucket = "project-a7a3fa03-8eb7-4ee7-b96-tfstate"
  prefix = "production"
}
```

Then run `terraform init -migrate-state` from the production directory and
confirm the migration prompt. Verify with `terraform state list` before
removing any local state copy. Do not use the app upload bucket for state.
See the [GCS backend documentation](https://developer.hashicorp.com/terraform/language/backend/gcs).

If any command fails, stop at that command. Do not repeat an apply against a
new or missing state file.
