import { executeAccess } from '../auth/executeAccess.js';
import { Forbidden } from '../errors/Forbidden.js';
export const checkFileAccess = async ({ collection, filename, prefix, req })=>{
    if (filename.includes('../') || filename.includes('..\\')) {
        throw new Forbidden(req.t);
    }
    const { config } = collection;
    const accessResult = await executeAccess({
        data: {
            filename
        },
        isReadingStaticFile: true,
        req
    }, config.access.read);
    const constraints = [];
    if (typeof accessResult === 'object') {
        constraints.push(accessResult);
    }
    if (typeof prefix === 'string') {
        constraints.push({
            prefix: {
                equals: prefix
            }
        });
    }
    if (constraints.length > 0) {
        const filenameCondition = {
            or: [
                {
                    filename: {
                        equals: filename
                    }
                }
            ]
        };
        if (config.upload.imageSizes) {
            config.upload.imageSizes.forEach(({ name })=>{
                filenameCondition.or.push({
                    [`sizes.${name}.filename`]: {
                        equals: filename
                    }
                });
            });
        }
        const doc = await req.payload.db.findOne({
            collection: config.slug,
            req,
            where: {
                and: [
                    filenameCondition,
                    ...constraints
                ]
            }
        });
        if (!doc) {
            throw new Forbidden(req.t);
        }
        return doc;
    }
};

//# sourceMappingURL=checkFileAccess.js.map