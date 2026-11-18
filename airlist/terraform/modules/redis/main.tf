###############################################################################
# Module: redis
# Creates: Cloud Memorystore for Redis (required for Socket.IO multi-instance)
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }
variable "vpc_self_link" { type = string }
variable "psa_range_name" { type = string }

###############################################################################
# Memorystore Redis — BASIC tier, 1 GB memory (~$29/mo)
# Upgrade to STANDARD_HA for automatic failover (doubles cost)
###############################################################################
resource "google_redis_instance" "redis" {
  name           = "${var.prefix}-redis"
  project        = var.project_id
  region         = var.region
  tier           = "BASIC" # STANDARD_HA for production failover
  memory_size_gb = 1

  authorized_network = var.vpc_self_link
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_0"

  reserved_ip_range = var.psa_range_name

  labels = var.labels

  redis_configs = {
    maxmemory-policy       = "allkeys-lru" # evict oldest key when full (good for cache)
    notify-keyspace-events = ""            # disable keyspace events to save CPU
  }

  lifecycle {
    prevent_destroy = true
  }
}

###############################################################################
# Outputs
###############################################################################
output "host" { value = google_redis_instance.redis.host }
output "port" { value = google_redis_instance.redis.port }
output "id" { value = google_redis_instance.redis.id }
