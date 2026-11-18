###############################################################################
# Module: secrets
# Creates: Secret Manager secrets + IAM bindings for Cloud Run SAs
###############################################################################

variable "project_id" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }
variable "secrets" { type = map(string) } # name → value
variable "backend_sa_email" { type = string }
variable "frontend_sa_email" { type = string }

###############################################################################
# Create each secret and store its value
###############################################################################
resource "google_secret_manager_secret" "secrets" {
  for_each  = var.secrets
  secret_id = "${var.prefix}-${replace(each.key, "_", "-")}"
  project   = var.project_id
  labels    = var.labels

  replication {
    user_managed {
      replicas {
        location = "europe-west1"
      }
    }
  }
}

resource "google_secret_manager_secret_version" "versions" {
  for_each    = var.secrets
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}

###############################################################################
# IAM — backend SA can access all secrets
###############################################################################
resource "google_secret_manager_secret_iam_member" "backend_accessor" {
  for_each  = var.secrets
  secret_id = google_secret_manager_secret.secrets[each.key].id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.backend_sa_email}"
}

###############################################################################
# IAM — frontend SA can only access google_client_secret
###############################################################################
resource "google_secret_manager_secret_iam_member" "frontend_google_secret" {
  secret_id = google_secret_manager_secret.secrets["google_client_secret"].id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.frontend_sa_email}"
}

###############################################################################
# Outputs — map of friendly-name → secret resource ID
###############################################################################
output "secret_ids" {
  value = { for k, s in google_secret_manager_secret.secrets : k => s.secret_id }
}
