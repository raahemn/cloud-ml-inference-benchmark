# ML Coordinator

This crate is a small Rust inference gateway for the current local setup.

Current flow:

```text
Frontend
  -> POST /predict on Rust coordinator
     -> coordinator reads uploaded image bytes
     -> coordinator calls teammate's gRPC ModelInference.Predict
     -> coordinator returns { class_id, confidence, label }
```

## Endpoints

- `POST /predict`
- `GET /health`

## Main Files

- `src/main.rs`
  Starts the Actix server and registers routes.
- `src/handlers.rs`
  Reads the uploaded image and forwards it to gRPC.
- `src/config.rs`
  Reads `COORDINATOR_BIND` and `GRPC_INFERENCE_URL`.
- `proto/inference.proto`
  The gRPC contract used by the coordinator client.

## Local Run

### 1. Start the gRPC inference service

From the monorepo root:

```bash
cd ml-grpc-service
LOCAL_MODEL_PATH=/Users/parikshitnarang/Desktop/cmpt756/cloud-ml-inference-benchmark/ml-grpc-service/ml-models/resnet18_cifar10.pth ./.venv/bin/python run.py
```

### 2. Start the coordinator

```bash
cd coordinator
cargo run
```

### 3. Test the coordinator directly

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@/full/path/to/image.jpg"
```

### 4. Health check

```bash
curl http://127.0.0.1:8000/health
```

## Cloud Trace

The coordinator now emits request spans for inbound HTTP requests, the outbound
gRPC inference call, training-sample uploads, and Pub/Sub trigger publishing.

To export those spans to an OpenTelemetry Collector or directly to Cloud Trace,
set:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://YOUR_COLLECTOR_HOST:4317
export OTEL_SERVICE_ENV=gke
```

If `OTEL_EXPORTER_OTLP_ENDPOINT` is not set, the coordinator still starts
normally and keeps structured request logs enabled.
