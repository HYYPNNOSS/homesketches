###############################################################################
# Production variables
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

# ── Domains ──────────────────────────────────────────────────────────────────
variable "frontend_domain" {
  description = "Public domain for the frontend (e.g. nglob.com)"
  type        = string
  default     = "nglob.com"
}

variable "backend_domain" {
  description = "Public domain for the backend API (e.g. api.nglob.com)"
  type        = string
  default     = "api.nglob.com"
}

# ── Docker image tags ─────────────────────────────────────────────────────────
variable "backend_image_tag" {
  description = "Docker image tag for the backend (set by CI/CD)"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Docker image tag for the frontend (set by CI/CD)"
  type        = string
  default     = "latest"
}

# ── Cloud Run scaling ──────────────────────────────────────────────────────────
variable "backend_min_instances" {
  description = "Minimum Cloud Run instances for backend (0 = scale to zero)"
  type        = number
  default     = 1
}

variable "backend_max_instances" {
  description = "Maximum Cloud Run instances for backend"
  type        = number
  default     = 10
}

variable "frontend_min_instances" {
  description = "Minimum Cloud Run instances for frontend (0 = scale to zero)"
  type        = number
  default     = 1
}

variable "frontend_max_instances" {
  description = "Maximum Cloud Run instances for frontend"
  type        = number
  default     = 5
}

# ── Database ──────────────────────────────────────────────────────────────────
variable "db_name" {
  description = "MySQL database name"
  type        = string
  default     = "nglob"
}

variable "db_user" {
  description = "MySQL database user"
  type        = string
  default     = "nglob_app"
}

variable "db_password" {
  description = "MySQL database password — stored in Secret Manager"
  type        = string
  sensitive   = true
}

# ── GCS ───────────────────────────────────────────────────────────────────────
variable "gcs_bucket_name" {
  description = "GCS bucket for file uploads"
  type        = string
  default     = "nglob-storage"
}

# ── Secrets (sensitive — set via terraform.tfvars or CI env) ──────────────────
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key (non-sensitive, exposed to browser)"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth2 client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth2 client secret"
  type        = string
  sensitive   = true
}

variable "google_maps_key" {
  description = "Google Maps / Places API key"
  type        = string
  sensitive   = true
}
