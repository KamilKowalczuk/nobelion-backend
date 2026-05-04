import { buildJoinScopeWhere } from './buildJoinScopeWhere.js';
import { getValueAtPath } from './getValueAtPath.js';
/**
 * Builds a join-scope filter for order key generation during beforeChange.
 */ export function getJoinScopeWhereFromDocData(args) {
    const { collectionSlug, data, joinFieldPathsByCollection, orderableFieldName, originalDoc } = args;
    const joinOnFieldPath = joinFieldPathsByCollection?.get(collectionSlug)?.get(orderableFieldName);
    if (!joinOnFieldPath) {
        return null;
    }
    const scopeValue = getValueAtPath(data, joinOnFieldPath) ?? getValueAtPath(originalDoc, joinOnFieldPath);
    return buildJoinScopeWhere({
        joinOnFieldPath,
        scopeValue
    });
}

//# sourceMappingURL=getJoinScopeWhereFromDocData.js.map