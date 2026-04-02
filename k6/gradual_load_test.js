import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 needs to load this into memory before the test starts
const imageBytes = open('/Users/raahemnabeel/Downloads/United_Airlines_Boeing_777-200_Meulemans.jpg', 'b');

export const options = {
    scenarios: {
        gradual_load: {
            executor: 'ramping-arrival-rate',   // smooth ramp of requests/sec
            startRate: 1,                       // start with 1 request/sec
            timeUnit: '1s',
            stages: [
                { target: 2, duration: '30s' },
                { target: 4, duration: '30s' },
                { target: 6, duration: '30s' },
                { target: 8, duration: '30s' },
                { target: 9, duration: '30s' },
                { target: 9, duration: '30s' },
                { target: 0, duration: '1m' }
            ],
            preAllocatedVUs: 10,                 // initial VUs for smooth execution
            maxVUs: 50,                          // allow scaling if spikes happen
            exec: 'predict',
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<8000'],
        'http_req_failed': ['rate<0.05'],
    },
};


export function predict() {
    const BASE_URL = 'https://inference-hybrid-coordinator-254882982092.northamerica-northeast1.run.app';
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