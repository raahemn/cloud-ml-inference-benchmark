import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const endpoint = __ENV.PREDICT_ENDPOINT || '/predict';
const imagePath = __ENV.IMAGE_PATH;
const architecture = __ENV.ARCHITECTURE || 'cloudrun';
const environment = __ENV.ENVIRONMENT || 'baseline';
const inferenceType = __ENV.INFERENCE_TYPE || 'short';
const imageKind = __ENV.IMAGE_KIND || 'sample-image';

if (!imagePath) {
  fail('Please set IMAGE_PATH. Example: -e IMAGE_PATH=/full/path/to/image.jpg');
}

const imageBytes = open(imagePath, 'b');

const commonTags = {
  architecture: architecture,
  environment: environment,
  endpoint: endpoint,
  test_type: 'predict',
  inference_type: inferenceType,
  image_kind: imageKind,
  workload: 'baseline_low_traffic',
};

export const inferenceFailures = new Rate('inference_failures');
export const baselineLatency = new Trend('baseline_latency');
export const successfulPredictions = new Counter('successful_predictions');

export const options = {
  scenarios: {
    baseline_low_traffic: {
      executor: 'constant-vus',
      vus: 1,
      duration: '60s',
      exec: 'predictOnce',
      tags: commonTags,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    http_req_duration: ['p(50)<1500', 'p(95)<5000', 'p(99)<10000'],
    baseline_latency: ['p(50)<1500', 'p(95)<5000', 'p(99)<10000'],
    inference_failures: ['rate<0.05'],
  },
};

export function predictOnce() {
  const formData = {
    file: http.file(imageBytes, imagePath.split('/').pop(), 'image/jpeg'),
  };

  const response = http.post(`${baseUrl}${endpoint}`, formData, {
    tags: commonTags,
    timeout: '60s',
  });

  baselineLatency.add(response.timings.duration);

  const ok = check(response, {
    'predict returned 200': (r) => r.status === 200,
    'predict returned JSON': (r) =>
      (r.headers['Content-Type'] || '').includes('application/json'),
  });

  if (ok) {
    successfulPredictions.add(1);
    inferenceFailures.add(false);
  } else {
    inferenceFailures.add(true);
  }

  sleep(1);
}
