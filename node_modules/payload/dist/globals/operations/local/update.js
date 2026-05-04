import { APIError } from '../../../errors/index.js';
import { deepCopyObjectSimple } from '../../../index.js';
import { createLocalReq } from '../../../utilities/createLocalReq.js';
import { updateOperation } from '../update.js';
export async function updateGlobalLocal(payload, options) {
    const { slug: globalSlug, data, depth, draft, overrideAccess = true, overrideLock, populate, publishAllLocales, publishSpecificLocale, select, showHiddenFields, unpublishAllLocales } = options;
    const globalConfig = payload.globals.config.find((config)=>config.slug === globalSlug);
    if (!globalConfig) {
        throw new APIError(`The global with slug ${String(globalSlug)} can't be found.`);
    }
    return updateOperation({
        slug: globalSlug,
        data: deepCopyObjectSimple(data),
        depth,
        draft,
        globalConfig,
        overrideAccess,
        overrideLock,
        populate,
        publishAllLocales,
        publishSpecificLocale: publishSpecificLocale,
        req: await createLocalReq(options, payload),
        select,
        showHiddenFields,
        unpublishAllLocales
    });
}

//# sourceMappingURL=update.js.map