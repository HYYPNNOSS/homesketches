###############################################################################
# Module: artifact-registry
# Creates: Docker repository for backend and frontend images
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }

resource "google_artifact_registry_repository" "docker" {
  repository_id = "${var.prefix}-registry"
  project       = var.project_id
  location      = var.region
  format        = "DOCKER"
  description   = "Docker images for nglob backend and frontend"
  labels        = var.labels

  # Cleanup policy — keep last 10 tagged images per package, delete untagged after 7 days
  cleanup_policies {
    id     = "keep-tagged-releases"
    action = "KEEP"
    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["v", "sha-", "latest"]
      newer_than   = "2592000s" # 30 days
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  cleanup_policy_dry_run = false
}

###############################################################################
# Outputs
###############################################################################
output "repository_id" { value = google_artifact_registry_repository.docker.repository_id }
output "repository_url" { value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}" }
