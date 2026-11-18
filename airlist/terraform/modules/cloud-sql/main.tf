###############################################################################
# Module: cloud-sql
# Creates: Cloud SQL for MySQL 8.0 (private IP, automated backups, HA-ready)
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }
variable "vpc_self_link" { type = string }
variable "psa_range_name" { type = string }
variable "db_name" { type = string }
variable "db_user" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}

resource "random_id" "db_suffix" {
  byte_length = 4
}

###############################################################################
# Cloud SQL instance — db-f1-micro is the cheapest tier (~$7/mo)
# Upgrade to db-g1-small (~$25/mo) or db-n1-standard-1 for production load
###############################################################################
resource "google_sql_database_instance" "mysql" {
  name             = "${var.prefix}-mysql-${random_id.db_suffix.hex}"
  project          = var.project_id
  region           = var.region
  database_version = "MYSQL_8_0"

  # Prevent accidental deletion
  deletion_protection = true

  settings {
    tier                  = "db-f1-micro" # cheapest; bump to db-g1-small for real production
    availability_type     = "ZONAL"       # switch to "REGIONAL" for HA (doubles cost)
    disk_autoresize       = true
    disk_autoresize_limit = 100 # max 100 GB auto-grow
    disk_size             = 10  # start at 10 GB SSD
    disk_type             = "PD_SSD"

    user_labels = var.labels

    # Private IP only — no public IP
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.vpc_self_link
      enable_private_path_for_google_cloud_services = true
    }

    # Automated backups — retain 7 days, run at 03:00 UTC
    backup_configuration {
      enabled                        = true
      binary_log_enabled             = true # required for point-in-time recovery
      start_time                     = "03:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window — Saturday 04:00 UTC
    maintenance_window {
      day          = 7 # Saturday
      hour         = 4
      update_track = "stable"
    }

    # MySQL flags for performance and security
    database_flags {
      name  = "slow_query_log"
      value = "on"
    }
    database_flags {
      name  = "long_query_time"
      value = "2"
    }
    database_flags {
      name  = "max_connections"
      value = "200"
    }
    database_flags {
      name  = "character_set_server"
      value = "utf8mb4"
    }
    database_flags {
      name  = "collation_server"
      value = "utf8mb4_unicode_ci"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [settings[0].disk_size] # ignore disk autoresize changes
  }
}

###############################################################################
# Database
###############################################################################
resource "google_sql_database" "nglob" {
  name      = var.db_name
  instance  = google_sql_database_instance.mysql.name
  project   = var.project_id
  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

###############################################################################
# User — password is managed by Secret Manager in the secrets module
###############################################################################
resource "google_sql_user" "app_user" {
  name     = var.db_user
  instance = google_sql_database_instance.mysql.name
  project  = var.project_id
  host     = "%" # Cloud SQL proxy / Unix socket connections use % host
  password = var.db_password
}

###############################################################################
# Outputs
###############################################################################
output "instance_name" { value = google_sql_database_instance.mysql.name }
output "connection_name" { value = google_sql_database_instance.mysql.connection_name }
output "private_ip" { value = google_sql_database_instance.mysql.private_ip_address }
