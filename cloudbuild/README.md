# Cloud Build For Cloud Run Inference

This folder contains the GCP-native pipeline for the `cloudrun` inference variant.

## File

- `cloudrun.inference.yaml`

## What it does

1. Builds the Rust coordinator image
2. Pushes the coordinator image to Artifact Registry
3. Builds the gRPC model image
4. Pushes the gRPC model image to Artifact Registry
5. Runs Terraform for `infra/inference/cloudrun`
6. Deploys:
   - `inference-cloudrun-coordinator`
   - `inference-cloudrun-grpc-model`
   - the Cloud Run fronting load balancer resources

## How to use it in Google Cloud

Create a Cloud Build trigger that points to:

- `cloudbuild/cloudrun.inference.yaml`

Recommended substitutions:

- `_REGION=northamerica-northeast1`
- `_ARTIFACT_REGISTRY_LOCATION=northamerica-northeast1`
- `_ARTIFACT_REPOSITORY=inference-cloudrun-images`

## Required IAM for the Cloud Build service account

The Cloud Build service account needs at least:

- Artifact Registry Writer
- Cloud Run Admin
- Service Account User
- Compute Admin
- Secret Manager Admin

If Terraform is applying all infrastructure, it also needs the permissions already required by your Terraform GCP resources.
