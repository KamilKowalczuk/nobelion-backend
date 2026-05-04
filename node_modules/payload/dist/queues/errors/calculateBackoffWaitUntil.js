import { getCurrentDate } from '../utilities/getCurrentDate.js';
export function calculateBackoffWaitUntil({ retriesConfig, totalTried }) {
    const now = getCurrentDate();
    let waitUntil = now;
    if (typeof retriesConfig === 'object') {
        if (retriesConfig.backoff) {
            if (retriesConfig.backoff.type === 'fixed') {
                waitUntil = retriesConfig.backoff.delay ? new Date(now.getTime() + retriesConfig.backoff.delay) : now;
            } else if (retriesConfig.backoff.type === 'exponential') {
                // 2 ^ (attempts - 1) * delay (current attempt is not included in totalTried, thus no need for -1)
                const delay = retriesConfig.backoff.delay ? retriesConfig.backoff.delay : 0;
                waitUntil = new Date(now.getTime() + Math.pow(2, totalTried) * delay);
            }
        }
    }
    return waitUntil;
}

//# sourceMappingURL=calculateBackoffWaitUntil.js.map