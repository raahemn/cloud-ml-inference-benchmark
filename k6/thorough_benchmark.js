import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 needs to load this into memory before the test starts
const imageBytes = open('/Users/raahemnabeel/Downloads/United_Airlines_Boeing_777-200_Meulemans.jpg', 'b');

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'predict',
    },
    capacity_load: {
      executor: 'constant-arrival-rate',
      rate: 20, 
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 30,     
      startTime: '35s',
      exec: 'predict',
    },
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      stages: [
        { target: 40, duration: '1m' },
        { target: 0, duration: '30s' },
      ],
      preAllocatedVUs: 20,
      maxVUs: 60,   
      startTime: '100s',
      exec: 'predict',
    },
  },
  thresholds: {
    'http_req_duration': ['p(90)<1500', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'],
  },
};


export function predict() {
  const BASE_URL = 'http://35.203.31.29';
  const url = `${BASE_URL}/predict`;

  // 2. Wrap the bytes in an http.file object
  const formData = {
    file: http.file(imageBytes, 'image.jpg', 'image/jpeg'),
  };

  // 3. DO NOT use JSON.stringify or set 'Content-Type': 'application/json'
  // k6 will automatically set the correct Multipart boundary headers
  const res = http.post(url, formData);

  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.5);
}