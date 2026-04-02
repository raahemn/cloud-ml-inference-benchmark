import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Load image into memory once
const imageBytes = open('/Users/raahemnabeel/Downloads/United_Airlines_Boeing_777-200_Meulemans.jpg', 'b');

// Custom metric for request duration
export let reqDuration = new Trend('request_duration_ms');

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      stages: [
        { target: 5, duration: '1m' },   // 👈 baseline (important)
        { target: 10, duration: '1m' },  // 👈 ramp to burst
        { target: 10, duration: '2m' },  // 👈 HOLD burst (pods scale here)
        { target: 5, duration: '1m' },   // 👈 ramp down
        // { target: 5, duration: '1m' },   // 👈 recovery observation
      ],
      preAllocatedVUs: 10,
      maxVUs: 40,
      exec: 'predict',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<8000'],  // p95 latency under 8s is acceptable
    'http_req_failed': ['rate<0.01'],     // allow <1% failures
  },
};

export function predict() {
  const BASE_URL = 'https://inference-cloudrun-coordinator-254882982092.northamerica-northeast1.run.app';
  const url = `${BASE_URL}/predict`;

  const formData = {
    file: http.file(imageBytes, 'image.jpg', 'image/jpeg'),
  };

  const res = http.post(url, formData);

  // Track duration in ms for custom metric
  reqDuration.add(res.timings.duration);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // small sleep to avoid unrealistic back-to-back requests
  sleep(0.5);
}