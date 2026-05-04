// @ts-strict-ignore
import crypto from 'crypto';
export const authenticateLocalStrategy = async ({ doc, password })=>{
    try {
        const { hash, salt } = doc;
        if (typeof salt === 'string' && typeof hash === 'string') {
            const res = await new Promise((resolve, reject)=>{
                crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (e, hashBuffer)=>{
                    if (e) {
                        reject(e);
                    }
                    const storedHashBuffer = Buffer.from(hash, 'hex');
                    if (hashBuffer.length === storedHashBuffer.length && crypto.timingSafeEqual(hashBuffer, storedHashBuffer)) {
                        resolve(doc);
                    } else {
                        reject(new Error('Invalid password'));
                    }
                });
            });
            return res;
        }
        return null;
    } catch (ignore) {
        return null;
    }
};

//# sourceMappingURL=authenticate.js.map