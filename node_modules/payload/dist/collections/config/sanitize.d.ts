import type { Config, SanitizedConfig } from '../../config/types.js';
import type { OrderableJoinInfo } from '../../fields/config/sanitizeJoinField.js';
import type { CollectionConfig, SanitizedCollectionConfig } from './types.js';
/**
 * Warns at startup when custom collection views are misconfigured with a missing `path`.
 * Views without `path` will never be matched by the router and are silently ignored.
 */
export declare const warnOnInvalidCustomViews: (collection: CollectionConfig) => void;
export declare const sanitizeCollection: (config: Config, collection: CollectionConfig, richTextSanitizationPromises?: Array<(config: SanitizedConfig) => Promise<void>>, _validRelationships?: string[], orderableJoins?: OrderableJoinInfo[]) => Promise<SanitizedCollectionConfig>;
//# sourceMappingURL=sanitize.d.ts.map