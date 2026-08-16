# Cloud ML Inference Benchmark

**Containerized vs Serverless Deployments for ResNet-18: Solving the Scaling Paradox for Compute-Heavy ML Workloads**

Standard ML deployments often couple inference and training, leading to resource contention. This project evaluates a system designed to prioritize inference speed while allowing background model evolution through asynchronous training and gRPC communication.

![CMPT 756](https://img.shields.io/badge/CMPT-756-blue?style=flat)
![SFU Project](https://img.shields.io/badge/SFU-Project-red?style=flat)

**[Live Web Application Demo](https://frontend-254882982092.us-central1.run.app/)**

## Primary Objective

Measure how different cloud abstractions handle the latency and scaling requirements of a real-time inference service versus a secondary background training task.

## Core Functionalities

Prioritize low-latency inference while enabling continuous model evolution through asynchronous training and gRPC-based communication — solving the "Scaling Paradox" for compute-heavy ML workloads.

- **Rust Coordinator:** Low-latency request routing.
- **gRPC Inference:** Non-blocking swift prediction cycles.
- **Async Training:** Fine-tunes on fresh data without interrupting inference.
- **Auto Model Deploy:** Background detection and seamless model hot-swap.
- **Full Observability:** OpenTelemetry tracing across service boundaries.

## Deployment Variables

We are evaluating three primary cloud deployment architectures:

1. **Cloud Run (Serverless / Scale-to-Zero):** Investigating agility and model-loading overhead. All 3 services are deployed on Cloud Run.
2. **GKE Orchestrated (Warm Pods):** Benchmarking warm-pod consistency and Horizontal Pod Autoscaler (HPA) scaling lag. All 3 services are deployed on GKE.
3. **Hybrid:** Coordinator hosted on Cloud Run; Inference service hosted on GKE.

## Inference Infrastructure

Terraform starters for the three inference deployment variants are located under:

- [`infra/inference`](./infra/inference/README.md)

Supported variants:
- `hybrid`
- `gke`
- `cloudrun`

## Cloud Build Pipeline

The Cloud Run inference deployment can be driven by Cloud Build using:

- [`cloudbuild/cloudrun.inference.yaml`](./cloudbuild/cloudrun.inference.yaml)

This pipeline performs the following steps:
1. Builds the coordinator image.
2. Builds the gRPC model image.
3. Pushes both images to Artifact Registry.
4. Runs Terraform for the `cloudrun` inference variant.
5. Deploys the Cloud Run services and load balancer resources.

## Getting Started

### ML gRPC Service

Navigate to the `ml-grpc-service` directory and set up the environment:

```bash
cd ml-grpc-service

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `ml-grpc-service` directory with the following variables:

```env
GCS_BUCKET=<bucket name>
GCS_MODEL_PATH=<model path>
LOCAL_MODEL_PATH=./ml-models/<model name>
```

Run and test the server:

```bash
# Run the gRPC server
python run.py

# Test the gRPC server
python tests/test_client.py
```

### Frontend

Navigate to the frontend project and start the development server:

```bash
# Install dependencies
npm install

# Run the frontend
npm run dev
```

### Presentation

<img width="1469" height="827" alt="image" src="https://github.com/user-attachments/assets/3531909f-6147-4156-bdb1-b9acf9d81305" />

<img width="1469" height="827" alt="image" src="https://github.com/user-attachments/assets/78a3543b-c3fa-4012-8b2b-3af415bf3990" />

<img width="1469" height="827" alt="image" src="https://github.com/user-attachments/assets/77f2b5d6-a38e-40da-9ca4-a98323abb5a5" />

<img width="1469" height="827" alt="image" src="https://github.com/user-attachments/assets/9cce8bbd-61df-483f-9d13-1d60c8e84543" />







