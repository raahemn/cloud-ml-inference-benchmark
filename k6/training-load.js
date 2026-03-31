import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const endpoint = __ENV.TRAINING_ENDPOINT || '/training';
const imagePath = __ENV.IMAGE_PATH;
const label = __ENV.LABEL || 'sample-label';
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
  test_type: 'training',
  inference_type: inferenceType,
  image_kind: imageKind,
};

export const trainingFailures = new Rate('training_failures');
export const trainingLatency = new Trend('training_latency');
export const successfulUploads = new Counter('successful_uploads');

export const options = {
  scenarios: {
    low_traffic: {
      executor: 'constant-vus',
      vus: 1,
      duration: '20s',
      exec: 'uploadTrainingSample',
      tags: { ...commonTags, workload: 'low_traffic' },
    },
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '40s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'uploadTrainingSample',
      startTime: '25s',
      tags: { ...commonTags, workload: 'steady_traffic' },
    },
    bursty_traffic: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      stages: [
        { target: 1, duration: '10s' },
        { target: 10, duration: '10s' },
        { target: 1, duration: '10s' },
        { target: 10, duration: '10s' },
      ],
      exec: 'uploadTrainingSample',
      startTime: '70s',
      tags: { ...commonTags, workload: 'bursty_traffic' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    http_req_duration: ['p(50)<2000', 'p(95)<7000', 'p(99)<12000'],
    training_latency: ['p(50)<2000', 'p(95)<7000', 'p(99)<12000'],
    training_failures: ['rate<0.05'],
  },
};

export function uploadTrainingSample() {
  const formData = {
    file: http.file(imageBytes, imagePath.split('/').pop(), 'image/jpeg'),
    label: label,
  };

  const response = http.post(`${baseUrl}${endpoint}`, formData, {
    tags: commonTags,
    timeout: '60s',
  });

  trainingLatency.add(response.timings.duration);

  const ok = check(response, {
    'training returned success': (r) => r.status >= 200 && r.status < 300,
    'training returned JSON': (r) =>
      (r.headers['Content-Type'] || '').includes('application/json'),
  });

  if (ok) {
    successfulUploads.add(1);
    trainingFailures.add(false);
  } else {
    trainingFailures.add(true);
  }

  sleep(1);
}
