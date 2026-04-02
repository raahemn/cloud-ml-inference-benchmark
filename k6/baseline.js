import http from 'k6/http';
import { check, sleep } from 'k6';

const imageBytes = open('/Users/raahemnabeel/Downloads/United_Airlines_Boeing_777-200_Meulemans.jpg', 'b');

export const options = {
    vus: 1,              // ONLY one user
    duration: '1m',      // run long enough for stable stats
};

export default function () {
    const BASE_URL = 'http://35.203.31.29';
    const url = `${BASE_URL}/predict`;

    const formData = {
        file: http.file(imageBytes, 'image.jpg', 'image/jpeg'),
    };

    const res = http.post(url, formData);

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1); // IMPORTANT: spacing requests to avoid artificial load
}