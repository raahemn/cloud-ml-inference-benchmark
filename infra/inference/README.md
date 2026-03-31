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
- Training service on Cloud Run
- Shared training bucket and Pub/Sub trigger infra provisioned alongside the cluster
- Can reuse an existing GKE cluster for the gRPC model when quota is tight

Path:

```text
infra/inference/hybrid
```

### 2. GKE

- Load balancer reserved for coordinator ingress
- Coordinator on GKE
- gRPC model service on GKE
- Shared training bucket and Pub/Sub trigger infra provisioned alongside the cluster

Path:

```text
infra/inference/gke
```

### 3. Cloud Run

- Load balancer in front of coordinator
- Coordinator on Cloud Run
- gRPC model service on Cloud Run
- Training service on Cloud Run with Pub/Sub trigger consumption

Path:

```text
infra/inference/cloudrun
```

## Shared modules

- `modules/common`
  APIs, Artifact Registry, service accounts, secrets, Pub/Sub training trigger, shared training bucket, optional VPC/subnet
- `modules/cloud_run_service`
  Small Cloud Run service wrapper
- `modules/gke_service`
  Autopilot GKE cluster

## Important note

This is a strong starter, not a fully finished production deployment.

In particular:

- the Hybrid variant still needs the Kubernetes manifests or deployment pipeline to publish the gRPC model service from GKE
- the GKE variant reserves the load balancer IP, but the actual GKE ingress/service object still needs to be applied from Kubernetes manifests
- the Cloud Run variants currently allow unauthenticated access for easier local experimentation; tighten IAM before production

## Typical usage

```bash
cd infra/inference/hybrid
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```
