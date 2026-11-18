###############################################################################
# Module: storage
# Creates: GCS bucket for user uploads + public access for item images
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }
variable "bucket_name" { type = string }
variable "backend_sa_email" { type = string }

###############################################################################
# Main storage bucket (re-uses the existing bucket name nglob-storage)
###############################################################################
resource "google_storage_bucket" "uploads" {
  name          = var.bucket_name
  project       = var.project_id
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false # safety: won't delete bucket with objects inside

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }

  labels = var.labels

  # Versioning — keep 3 non-current versions for accidental overwrite recovery
  versioning {
    enabled = true
  }

  # Lifecycle — delete non-current versions after 30 days to save costs
  lifecycle_rule {
    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # CORS — allow frontend domain + localhost for development
  cors {
    origin          = ["https://nglob.com", "https://www.nglob.com", "http://localhost:3000"]
    method          = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    response_header = ["Content-Type", "Authorization", "x-goog-resumable"]
    max_age_seconds = 3600
  }

  # Uniform bucket-level access (recommended by Google; no per-object ACLs)
  uniform_bucket_level_access = true

  # Soft delete — 7-day recovery window before permanent deletion
  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }
}

###############################################################################
# Preserve the existing bucket's public access settings.
###############################################################################
###############################################################################
resource "google_storage_bucket_iam_member" "storage_writer" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.backend_sa_email}"
}

###############################################################################
# Outputs
###############################################################################
output "bucket_name" { value = google_storage_bucket.uploads.name }
output "bucket_url" { value = google_storage_bucket.uploads.url }
output "storage_writer_sa_email" { value = var.backend_sa_email }
