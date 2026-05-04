import { parseCookies } from '../utilities/parseCookies.js';
const extractionMethods = {
    Bearer: ({ headers })=>{
        const jwtFromHeader = headers.get('Authorization');
        // RFC6750 OAuth 2.0 Bearer token
        if (jwtFromHeader?.startsWith('Bearer ')) {
            return jwtFromHeader.replace('Bearer ', '');
        }
        return null;
    },
    cookie: ({ headers, payload })=>{
        const cookies = parseCookies(headers);
        const tokenCookieName = `${payload.config.cookiePrefix}-token`;
        const cookieToken = cookies.get(tokenCookieName);
        if (!cookieToken) {
            return null;
        }
        const origin = headers.get('Origin');
        // Origin present — validate against csrf allowlist
        if (origin) {
            if (payload.config.csrf.length === 0 || payload.config.csrf.includes(origin)) {
                return cookieToken;
            }
            return null;
        }
        // No Origin and no csrf configured — no allowlist to enforce
        if (payload.config.csrf.length === 0) {
            return cookieToken;
        }
        // No Origin with csrf configured — fall back to Sec-Fetch-Site
        const secFetchSite = headers.get('Sec-Fetch-Site');
        // Allow same-origin, same-site, and direct navigations (none)
        if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
            return cookieToken;
        }
        // Reject cross-site requests and missing header (non-browser clients)
        return null;
    },
    JWT: ({ headers })=>{
        const jwtFromHeader = headers.get('Authorization');
        if (jwtFromHeader?.startsWith('JWT ')) {
            return jwtFromHeader.replace('JWT ', '');
        }
        return null;
    }
};
export const extractJWT = (args)=>{
    const { headers, payload } = args;
    const extractionOrder = payload.config.auth.jwtOrder;
    for (const extractionStrategy of extractionOrder){
        const result = extractionMethods[extractionStrategy]({
            headers,
            payload
        });
        if (result) {
            return result;
        }
    }
    return null;
};

//# sourceMappingURL=extractJWT.js.map