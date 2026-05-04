import type { SanitizedJoin, SanitizedJoins } from '../../collections/config/types.js';
import type { Config } from '../../config/types.js';
import type { FlattenedJoinField, JoinField } from './types.js';
/**
 * Info about an orderable join field, collected during sanitization
 * and processed after all collections are sanitized.
 */
export type OrderableJoinInfo = {
    /** The `on` path of the join field */
    joinFieldOn: string;
    /** The name of the order field to add (e.g., `_posts_myJoin_order`) */
    orderFieldName: string;
    /** The collection that will receive the order field */
    targetCollectionSlug: string;
};
export declare const sanitizeJoinField: ({ config, field, joinPath, joins, orderableJoins, parentIsLocalized, polymorphicJoins, validateOnly, }: {
    config: Config;
    field: FlattenedJoinField | JoinField;
    joinPath?: string;
    joins?: SanitizedJoins;
    /** Tracker for orderable join fields - populated during sanitization */
    orderableJoins?: OrderableJoinInfo[];
    parentIsLocalized: boolean;
    polymorphicJoins?: SanitizedJoin[];
    validateOnly?: boolean;
}) => void;
//# sourceMappingURL=sanitizeJoinField.d.ts.map