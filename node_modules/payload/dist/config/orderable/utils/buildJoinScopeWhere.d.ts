import type { Where } from '../../../types/index.js';
/**
 * Builds a `where` fragment that scopes order operations to docs sharing the
 * same join `on` field value.
 */
export declare function buildJoinScopeWhere(args: {
    joinOnFieldPath: string;
    scopeValue: unknown;
}): null | Where;
//# sourceMappingURL=buildJoinScopeWhere.d.ts.map