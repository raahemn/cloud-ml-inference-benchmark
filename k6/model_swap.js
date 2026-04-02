import http from 'k6/http';
import { check, sleep } from 'k6';

// Preload the image into memory
const imageBytes = open('/Users/raahemnabeel/Downloads/United_Airlines_Boeing_777-200_Meulemans.jpg', 'b');

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-arrival-rate',  // maintain a fixed request rate
      rate: 5,                             // 5 requests/sec (adjust to your cluster size)
      timeUnit: '1s',                      // rate per second
      duration: '8m',                       // run long enough to cover the model swap
      preAllocatedVUs: 5,                  // VUs ready from the start
      maxVUs: 10,                           // allow scaling for small spikes
      exec: 'predict',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<8000'],   // relaxed to allow small delays
    http_req_failed: ['rate<0.01'],      // keep failures visible
  },
};

export function predict() {
  const BASE_URL = 'http://35.203.31.29';
  const formData = {
    file: http.file(imageBytes, 'image.jpg', 'image/jpeg'),
  };

  const res = http.post(`${BASE_URL}/predict`, formData);

  check(res, { 'status 200': (r) => r.status === 200 });

  sleep(0.5); // small delay to prevent request bursts
}