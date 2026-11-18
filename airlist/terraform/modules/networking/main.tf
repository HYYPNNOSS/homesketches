###############################################################################
# Module: networking
# Creates: VPC, subnet, Cloud NAT, VPC Access Connector, Private Services Access
###############################################################################

variable "project_id" { type = string }
variable "region" { type = string }
variable "prefix" { type = string }
variable "labels" { type = map(string) }
variable "vpc_cidr" { type = string }
variable "subnet_cidr" { type = string }
variable "redis_cidr" { type = string }
variable "psa_range_name" { type = string }
variable "psa_cidr" { type = string }

###############################################################################
# VPC
###############################################################################
resource "google_compute_network" "vpc" {
  name                    = "${var.prefix}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

###############################################################################
# Subnet (Cloud Run VPC connector lives here)
###############################################################################
resource "google_compute_subnetwork" "subnet" {
  name                     = "${var.prefix}-subnet"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true # Cloud Run SAs can reach GCS/Secret Manager without NAT
}

###############################################################################
# Cloud Router + NAT — allows private resources to reach the internet
###############################################################################
resource "google_compute_router" "router" {
  name    = "${var.prefix}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.prefix}-nat"
  project                            = var.project_id
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

###############################################################################
# Private Services Access — required for Cloud SQL private IP
###############################################################################
resource "google_compute_global_address" "psa_range" {
  name          = var.psa_range_name
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 22
  network       = google_compute_network.vpc.id
  address       = split("/", var.psa_cidr)[0]
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa_range.name]
}

###############################################################################
# Serverless VPC Access Connector — links Cloud Run to the VPC
###############################################################################
resource "google_vpc_access_connector" "connector" {
  name          = "${var.prefix}-vpc-cx"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = var.redis_cidr

  min_instances = 2
  max_instances = 10
  machine_type  = "e2-micro" # cheapest; handles ~200 Mbps per instance
}

###############################################################################
# Firewall — deny all ingress by default; allow egress
###############################################################################
resource "google_compute_firewall" "deny_all_ingress" {
  name     = "${var.prefix}-deny-all-ingress"
  project  = var.project_id
  network  = google_compute_network.vpc.name
  priority = 65534

  deny {
    protocol = "all"
  }

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_internal" {
  name     = "${var.prefix}-allow-internal"
  project  = var.project_id
  network  = google_compute_network.vpc.name
  priority = 1000

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  direction     = "INGRESS"
  source_ranges = ["10.0.0.0/8"]
}

###############################################################################
# Outputs
###############################################################################
output "vpc_self_link" { value = google_compute_network.vpc.self_link }
output "vpc_name" { value = google_compute_network.vpc.name }
output "subnet_self_link" { value = google_compute_subnetwork.subnet.self_link }
output "vpc_connector_name" { value = google_vpc_access_connector.connector.name }
output "vpc_connector_id" { value = google_vpc_access_connector.connector.id }
