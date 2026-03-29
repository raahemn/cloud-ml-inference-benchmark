# Inference Infrastructure

This folder contains Terraform starters for the current inference-only architecture.

Logical naming rule:

```text
inference-<variant>-<service>
```

Examples:

- `inference-hybrid-coordinator`
- `inference-gke-grpc-model`
- `inference-cloudrun-lb-ip`

## Variants

### 1. Hybrid

- Load balancer in front of coordinator
- Coordinator on Cloud Run
- gRPC model service on GKE

Path:

```text
infra/inference/hybrid
```

### 2. GKE

- Load balancer reserved for coordinator ingress
- Coordinator on GKE
- gRPC model service on GKE

Path:

```text
infra/inference/gke
```

### 3. Cloud Run

- Load balancer in front of coordinator
- Coordinator on Cloud Run
- gRPC model service on Cloud Run

Path:

```text
infra/inference/cloudrun
```

## Shared modules

- `modules/common`
  APIs, Artifact Registry, service accounts, secrets, optional VPC/subnet
- `modules/cloud_run_service`
  Small Cloud Run service wrapper
- `modules/gke_service`
  Autopilot GKE cluster

## Important note

This is a strong starter, not a fully finished production deployment.

In particular:

- the Hybrid variant creates the GKE cluster, but you still need to deploy the gRPC model service into that cluster and then supply its reachable endpoint
- the GKE variant reserves the load balancer IP, but the actual GKE ingress/service object still needs to be applied from Kubernetes manifests
- the Cloud Run variants currently allow unauthenticated access for easier local experimentation; tighten IAM before production

## Typical usage

```bash
cd infra/inference/hybrid
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```
