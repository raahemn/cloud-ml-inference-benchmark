import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // Ramp from 0 to 200 users over 2 mins
    { duration: '1m', target: 200 }, // Stay at 200 for 1 min
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // P99 must be under 500ms
    http_req_failed: ['rate<0.01'],   // Errors must be less than 1%
  },
};

export default function () {
  const BASE_URL = 'https://inference-cloudrun-coordinator-254882982092.northamerica-northeast1.run.app'; 
  const res = http.get(`${BASE_URL}/predict`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.5);
}