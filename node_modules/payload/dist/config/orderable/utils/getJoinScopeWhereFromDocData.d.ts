import { buildJoinScopeWhere } from './buildJoinScopeWhere.js';
/**
 * Builds a join-scope filter for order key generation during beforeChange.
 */
export declare function getJoinScopeWhereFromDocData(args: {
    collectionSlug: string;
    data: Record<string, unknown>;
    joinFieldPathsByCollection?: Map<string, Map<string, string>>;
    orderableFieldName: string;
    originalDoc?: Record<string, unknown>;
}): ReturnType<typeof buildJoinScopeWhere>;
//# sourceMappingURL=getJoinScopeWhereFromDocData.d.ts.map