# k6 Load Testing

This folder contains simple `k6` scripts for testing the coordinator like a beginner would.

The goal is to help you measure:

- end-to-end latency
- `p50`, `p95`, `p99` latency
- requests per second
- error rate
- behavior under different traffic patterns

## What k6 can measure directly

`k6` is very good for client-side metrics such as:

- response time
- percentile latency
- request rate
- failures and timeouts

`k6` does **not** directly measure cloud cost, autoscaling time, CPU, or memory inside GCP.
For those, use Google Cloud Monitoring and Billing data alongside these scripts.

## Scripts in This Folder

- `predict-load.js`
  Tests `POST /predict`
- `predict-baseline.js`
  Tests `POST /predict` with low traffic only
- `training-load.js`
  Tests `POST /training`

## Before You Start

You need:

1. `k6` installed
2. one image file on your machine for `/predict`
3. one image file on your machine for `/training`
4. your backend URL

Examples:

- Local coordinator:
  - `http://127.0.0.1:8000`
- Cloud Run load balancer:
  - `http://34.49.30.185`

## Install k6

On macOS with Homebrew:

```bash
brew install k6
```

Check it:

```bash
k6 version
```

## Scenario Meanings

These scripts use four traffic patterns:

- `low_traffic`
  A few requests over time
- `steady_traffic`
  Constant load
- `bursty_traffic`
  Sudden jumps in traffic for short periods
- `spiky_traffic`
  Bigger jumps and drops to stress scaling

## 1. Test /predict

This endpoint expects:

- multipart form field: `file`

Example:

```bash
k6 run \
  -e BASE_URL=http://34.49.30.185 \
  -e IMAGE_PATH=/full/path/to/test-image.jpg \
  k6/predict-load.js
```

## 1a. Run a Baseline Low-Traffic Comparison

Use this when you want to isolate the effect of spike/burst behavior.

```bash
k6 run \
  -e BASE_URL=http://34.49.30.185 \
  -e IMAGE_PATH=/full/path/to/test-image.jpg \
  k6/predict-baseline.js
```

## 2. Test /training

This endpoint expects:

- multipart form field: `file`
- multipart form field: `label`

Example:

```bash
k6 run \
  -e BASE_URL=http://34.49.30.185 \
  -e IMAGE_PATH=/full/path/to/test-image.jpg \
  -e LABEL=cat \
  k6/training-load.js
```

## Important Environment Variables

All scripts support these:

- `BASE_URL`
  Backend root URL
- `IMAGE_PATH`
  Path to the image file to upload
- `LABEL`
  Used only for `/training`

Optional:

- `PREDICT_ENDPOINT`
  Default: `/predict`
- `TRAINING_ENDPOINT`
  Default: `/training`
- `ARCHITECTURE`
  Example: `cloudrun`, `gke`, `hybrid`
- `ENVIRONMENT`
  Example: `local`, `test`, `benchmark`
- `INFERENCE_TYPE`
  Example: `short`, `long`
- `IMAGE_KIND`
  Example: `small-image`, `large-image`

## Grafana-Friendly Tags

The scripts now attach tags that make Grafana dashboards easier to filter.

These tags are:

- `architecture`
- `environment`
- `endpoint`
- `test_type`
- `workload`
- `inference_type`
- `image_kind`

This means in Grafana Cloud k6 you can compare things like:

- Cloud Run vs GKE
- `/predict` vs `/training`
- low traffic vs bursty traffic
- short inference vs long inference
- baseline low traffic vs spiky traffic

## Example Run for Grafana Comparison

This example labels the run clearly for later graph filtering:

```bash
k6 run \
  -e BASE_URL=http://34.49.30.185 \
  -e IMAGE_PATH=/full/path/to/test-image.jpg \
  -e ARCHITECTURE=cloudrun \
  -e ENVIRONMENT=benchmark \
  -e INFERENCE_TYPE=short \
  -e IMAGE_KIND=small-image \
  k6/predict-load.js
```

For training:

```bash
k6 run \
  -e BASE_URL=http://34.49.30.185 \
  -e IMAGE_PATH=/full/path/to/test-image.jpg \
  -e LABEL=cat \
  -e ARCHITECTURE=cloudrun \
  -e ENVIRONMENT=benchmark \
  -e INFERENCE_TYPE=short \
  -e IMAGE_KIND=small-image \
  k6/training-load.js
```

## Note About Sleep and Arrival-Rate Scenarios

The stress script now keeps `sleep(1)` only for the low-traffic pacing path.

For the arrival-rate phases:

- `steady_traffic`
- `bursty_traffic`
- `spiky_traffic`

there is no artificial sleep anymore, so the generated load better matches the intended request rate.

## What to Look At in the Output

The most useful lines are:

- `http_req_duration`
- `http_req_failed`
- `checks`
- `iterations`

You especially want:

- `p(50)`
- `p(95)`
- `p(99)`

## How to Use This for Your Report

Use `k6` for:

- `p50`, `p95`, `p99`
- requests per second
- end-to-end latency
- success/failure rate

Use Google Cloud Monitoring for:

- CPU utilization
- memory utilization
- instance count
- autoscaling behavior

Use Billing data for:

- idle cost
- peak cost
- cost per inference
- cost during low traffic
- cost during burst traffic

## Simple Testing Plan

Run the same script against:

- Cloud Run
- Hybrid
- GKE

Then compare:

1. latency percentiles
2. throughput
3. failures
4. scaling behavior from GCP dashboards
5. cost from billing

## Beginner Tip

Start with:

1. local backend
2. one short test run
3. then move to Cloud Run

That way, if something fails, you know whether the problem is:

- your app
- your endpoint URL
- or the cloud deployment
