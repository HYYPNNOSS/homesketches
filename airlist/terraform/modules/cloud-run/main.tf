###############################################################################
# Module: cloud-run
# Creates: Cloud Run service + dedicated Service Account + IAM
# Reused for BOTH backend and frontend with different parameters
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "labels" { type = map(string) }
variable "service_name" { type = string }
variable "service_account_email" { type = string }
variable "image" { type = string }
variable "min_instances" {
  type    = number
  default = 1
}
variable "max_instances" {
  type    = number
  default = 10
}
variable "cpu" {
  type    = string
  default = "1"
}
variable "memory" {
  type    = string
  default = "512Mi"
}
variable "concurrency" {
  type    = number
  default = 80
}
variable "container_port" {
  type    = number
  default = 8080
}
variable "vpc_connector_name" { type = string }
variable "vpc_egress" {
  type    = string
  default = "PRIVATE_RANGES_ONLY"
}
variable "cloud_sql_instance" {
  type    = string
  default = null
}
variable "enable_cloud_sql" {
  type    = bool
  default = false
}
variable "env_vars" {
  type    = map(string)
  default = {}
}
variable "secret_env_vars" {
  type = map(object({
    secret  = string
    version = string
  }))
  default = {}
}

###############################################################################
# Dedicated Service Account per service (least privilege)
###############################################################################
# Allow the SA to use Cloud SQL (unix socket via Cloud SQL proxy sidecar)
resource "google_project_iam_member" "cloud_sql_client" {
  count   = var.enable_cloud_sql ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.service_account_email}"
}

# Allow SA to write traces and metrics
resource "google_project_iam_member" "trace_agent" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${var.service_account_email}"
}

resource "google_project_iam_member" "monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${var.service_account_email}"
}

###############################################################################
# Cloud Run service
###############################################################################
resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  project  = var.project_id
  location = var.region
  labels   = var.labels

  # Ingress: all — HTTPS from internet is handled by Cloud Run's managed LB
  ingress = "INGRESS_TRAFFIC_ALL"

  deletion_protection = false

  template {
    service_account = var.service_account_email
    labels          = var.labels

    # Scaling
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    # VPC networking — private ranges use the VPC connector
    vpc_access {
      connector = "projects/${var.project_id}/locations/${var.region}/connectors/${var.vpc_connector_name}"
      egress    = var.vpc_egress
    }

    # Cloud SQL connection (unix socket)
    dynamic "volumes" {
      for_each = var.cloud_sql_instance != null ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [var.cloud_sql_instance]
        }
      }
    }

    containers {
      image = var.image

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = true # reduce CPU allocation when request is not being processed (saves cost)
        startup_cpu_boost = true # burst CPU during cold start
      }

      # Plain env vars
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret env vars — pulled from Secret Manager at startup
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret
              version = env.value.version
            }
          }
        }
      }

      # Cloud SQL unix socket mount
      dynamic "volume_mounts" {
        for_each = var.cloud_sql_instance != null ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      # Liveness probe — hits /api/health (NestJS health module)
      liveness_probe {
        http_get {
          path = var.enable_cloud_sql ? "/api/health" : "/"
          port = var.container_port
        }
        initial_delay_seconds = 15
        period_seconds        = 30
        failure_threshold     = 3
        timeout_seconds       = 5
      }

      # Startup probe — give the app 60s to start (prisma generate can be slow)
      startup_probe {
        http_get {
          path = var.cloud_sql_instance != null ? "/api/health" : "/"
          port = var.container_port
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 12 # 12 × 5s = 60s max startup
        timeout_seconds       = 5
      }
    }

    max_instance_request_concurrency = var.concurrency

    # 5-minute timeout — covers long booking flows and file uploads
    timeout = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      # Allow CI/CD to update the image without Terraform conflicts
      template[0].containers[0].image,
      template[0].labels,
      labels,
    ]
  }
}

###############################################################################
# Allow public (unauthenticated) access — Cloud Run handles HTTPS termination
###############################################################################
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.service.name
  project  = var.project_id
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

###############################################################################
# Outputs
###############################################################################
output "service_url" { value = google_cloud_run_v2_service.service.uri }
output "service_account_email" { value = var.service_account_email }
output "service_name" { value = google_cloud_run_v2_service.service.name }
