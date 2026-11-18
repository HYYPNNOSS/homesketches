###############################################################################
# nglob.com — Production Infrastructure
# Region  : europe-west1 (Belgium)
# Platform: Google Cloud Platform
###############################################################################

terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {
    bucket = "project-a7a3fa03-8eb7-4ee7-b96-tfstate"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

###############################################################################
# Local values — single source of truth for names
###############################################################################
locals {
  env    = "prod"
  prefix = "nglob-${local.env}"

  # VPC-internal CIDR ranges
  vpc_cidr       = "10.0.0.0/16"
  subnet_cidr    = "10.0.1.0/24"
  redis_cidr     = "10.0.2.0/28"
  psa_range_name = "${local.prefix}-psa-range"
  psa_cidr       = "10.0.4.0/22"

  # Docker image tags — override with CI/CD pipeline values
  backend_image  = "${var.region}-docker.pkg.dev/${var.project_id}/${local.prefix}-registry/backend:${var.backend_image_tag}"
  frontend_image = "${var.region}-docker.pkg.dev/${var.project_id}/${local.prefix}-registry/frontend:${var.frontend_image_tag}"

  common_labels = {
    project    = "nglob"
    env        = local.env
    managed_by = "terraform"
  }
}

###############################################################################
# APIs — enable everything we need in one shot
###############################################################################
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "iamcredentials.googleapis.com",
    "iam.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

###############################################################################
# Modules
###############################################################################

module "networking" {
  source     = "../../modules/networking"
  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.common_labels

  vpc_cidr       = local.vpc_cidr
  subnet_cidr    = local.subnet_cidr
  redis_cidr     = local.redis_cidr
  psa_range_name = local.psa_range_name
  psa_cidr       = local.psa_cidr

  depends_on = [google_project_service.apis]
}

module "artifact_registry" {
  source     = "../../modules/artifact-registry"
  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.common_labels

  depends_on = [google_project_service.apis]
}

module "storage" {
  source     = "../../modules/storage"
  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.common_labels

  bucket_name      = var.gcs_bucket_name
  backend_sa_email = google_service_account.backend.email

  depends_on = [google_project_service.apis]
}

data "google_sql_database_instance" "existing" {
  name    = "nglob-db"
  project = var.project_id
}

module "redis" {
  source     = "../../modules/redis"
  project_id = var.project_id
  region     = var.region
  prefix     = local.prefix
  labels     = local.common_labels

  vpc_self_link  = module.networking.vpc_self_link
  psa_range_name = local.psa_range_name

  depends_on = [
    google_project_service.apis,
    module.networking,
  ]
}

module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id
  prefix     = local.prefix
  labels     = local.common_labels

  secrets = {
    database_url          = "mysql://${var.db_user}:${urlencode(var.db_password)}@localhost/${var.db_name}?socket=/cloudsql/${data.google_sql_database_instance.existing.connection_name}"
    jwt_secret            = var.jwt_secret
    jwt_refresh_secret    = var.jwt_refresh_secret
    stripe_secret_key     = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    google_client_secret  = var.google_client_secret
    redis_url             = "redis://${module.redis.host}:${module.redis.port}"
  }

  backend_sa_email  = google_service_account.backend.email
  frontend_sa_email = google_service_account.frontend.email

  depends_on = [
    google_project_service.apis,
    module.redis,
  ]
}

resource "google_service_account" "backend" {
  account_id   = "${local.prefix}-backend-sa"
  display_name = "${local.prefix}-backend Cloud Run SA"
  project      = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "frontend" {
  account_id   = "${local.prefix}-frontend-sa"
  display_name = "${local.prefix}-frontend Cloud Run SA"
  project      = var.project_id

  depends_on = [google_project_service.apis]
}

module "cloud_run_backend" {
  source     = "../../modules/cloud-run"
  project_id = var.project_id
  region     = var.region
  labels     = local.common_labels

  service_name          = "${local.prefix}-backend"
  service_account_email = google_service_account.backend.email
  image                 = local.backend_image

  min_instances = var.backend_min_instances
  max_instances = var.backend_max_instances

  cpu         = "1"
  memory      = "512Mi"
  concurrency = 200

  vpc_connector_name = module.networking.vpc_connector_name
  vpc_egress         = "PRIVATE_RANGES_ONLY"

  cloud_sql_instance = data.google_sql_database_instance.existing.connection_name
  enable_cloud_sql   = true

  container_port = 8080

  env_vars = {
    NODE_ENV           = "production"
    FRONTEND_URL       = "https://${var.frontend_domain}"
    API_URL            = "https://${var.backend_domain}/api"
    GCP_PROJECT_ID     = var.project_id
    GCP_STORAGE_BUCKET = var.gcs_bucket_name
    GOOGLE_CLIENT_ID   = var.google_client_id
  }

  secret_env_vars = {
    DATABASE_URL          = { secret = module.secrets.secret_ids["database_url"], version = "latest" }
    JWT_SECRET            = { secret = module.secrets.secret_ids["jwt_secret"], version = "latest" }
    JWT_REFRESH_SECRET    = { secret = module.secrets.secret_ids["jwt_refresh_secret"], version = "latest" }
    STRIPE_SECRET_KEY     = { secret = module.secrets.secret_ids["stripe_secret_key"], version = "latest" }
    STRIPE_WEBHOOK_SECRET = { secret = module.secrets.secret_ids["stripe_webhook_secret"], version = "latest" }
    GOOGLE_CLIENT_SECRET  = { secret = module.secrets.secret_ids["google_client_secret"], version = "latest" }
    REDIS_URL             = { secret = module.secrets.secret_ids["redis_url"], version = "latest" }
  }

  depends_on = [
    module.networking,
    module.redis,
    module.secrets,
    module.artifact_registry,
  ]
}

module "cloud_run_frontend" {
  count      = 0 # Frontend is hosted on Vercel.
  source     = "../../modules/cloud-run"
  project_id = var.project_id
  region     = var.region
  labels     = local.common_labels

  service_name          = "${local.prefix}-frontend"
  service_account_email = google_service_account.frontend.email
  image                 = local.frontend_image

  min_instances = var.frontend_min_instances
  max_instances = var.frontend_max_instances

  cpu         = "1"
  memory      = "1Gi"
  concurrency = 80

  vpc_connector_name = module.networking.vpc_connector_name
  vpc_egress         = "PRIVATE_RANGES_ONLY"

  container_port     = 3000
  cloud_sql_instance = null

  env_vars = {
    NODE_ENV                           = "production"
    API_URL                            = "https://${var.backend_domain}/api"
    NEXT_PUBLIC_WS_URL                 = "wss://${var.backend_domain}"
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = var.stripe_publishable_key
    NEXT_PUBLIC_GOOGLE_MAPS_KEY        = var.google_maps_key
    GCP_PROJECT_ID                     = var.project_id
    GCP_STORAGE_BUCKET                 = var.gcs_bucket_name
    GOOGLE_CLIENT_ID                   = var.google_client_id
    GEMINI_MODEL                       = "gemini-2.5-flash"
  }

  secret_env_vars = {
    GOOGLE_CLIENT_SECRET = { secret = module.secrets.secret_ids["google_client_secret"], version = "latest" }
  }

  depends_on = [
    module.networking,
    module.secrets,
    module.artifact_registry,
  ]
}

###############################################################################
# Outputs
###############################################################################
output "backend_url" {
  description = "Cloud Run backend service URL"
  value       = module.cloud_run_backend.service_url
}

output "frontend_url" {
  description = "Cloud Run frontend service URL"
  value       = "https://${var.frontend_domain}"
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name (for Cloud Run)"
  value       = data.google_sql_database_instance.existing.connection_name
}

output "redis_host" {
  description = "Memorystore Redis host (private)"
  value       = module.redis.host
  sensitive   = true
}

output "artifact_registry_url" {
  description = "Docker push URL"
  value       = module.artifact_registry.repository_url
}

output "gcs_bucket_name" {
  description = "GCS storage bucket"
  value       = module.storage.bucket_name
}
