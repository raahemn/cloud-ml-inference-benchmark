import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const endpoint = __ENV.PREDICT_ENDPOINT || '/predict';
const imagePath = __ENV.IMAGE_PATH;
const architecture = __ENV.ARCHITECTURE || 'cloudrun';
const environment = __ENV.ENVIRONMENT || 'test';
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
};

export const inferenceFailures = new Rate('inference_failures');
export const endToEndLatency = new Trend('end_to_end_latency');
export const successfulPredictions = new Counter('successful_predictions');

export const options = {
  scenarios: {
    low_traffic: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'predictOnce',
      tags: { ...commonTags, workload: 'low_traffic' },
    },
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 6,
      maxVUs: 20,
      exec: 'predictOnce',
      startTime: '35s',
      tags: { ...commonTags, workload: 'steady_traffic' },
    },
    bursty_traffic: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 8,
      maxVUs: 30,
      stages: [
        { target: 2, duration: '15s' },
        { target: 10, duration: '10s' },
        { target: 2, duration: '15s' },
        { target: 10, duration: '10s' },
        { target: 2, duration: '10s' },
      ],
      exec: 'predictOnce',
      startTime: '100s',
      tags: { ...commonTags, workload: 'bursty_traffic' },
    },
    spiky_traffic: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 40,
      stages: [
        { target: 1, duration: '10s' },
        { target: 15, duration: '5s' },
        { target: 1, duration: '10s' },
        { target: 20, duration: '5s' },
        { target: 1, duration: '10s' },
      ],
      exec: 'predictOnce',
      startTime: '165s',
      tags: { ...commonTags, workload: 'spiky_traffic' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    http_req_duration: ['p(50)<1500', 'p(95)<5000', 'p(99)<10000'],
    end_to_end_latency: ['p(50)<1500', 'p(95)<5000', 'p(99)<10000'],
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

  endToEndLatency.add(response.timings.duration);

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
