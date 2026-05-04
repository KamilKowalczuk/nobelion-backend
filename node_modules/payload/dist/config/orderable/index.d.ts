import type { CollectionConfig } from '../../collections/config/types.js';
import type { Config } from '../../config/types.js';
import type { SanitizedConfig } from '../types.js';
export declare const addOrderableFieldsAndHook: (collection: CollectionConfig, config: Config, orderableFieldNames: string[], joinFieldPathsByCollection?: Map<string, Map<string, string>>) => Promise<void>;
/**
 * The body of the reorder endpoint.
 * @internal
 */
export type OrderableEndpointBody = {
    collectionSlug: string;
    docsToMove: string[];
    newKeyWillBe: 'greater' | 'less';
    orderableFieldName: string;
    target: {
        id: string;
        key: string;
    };
};
export declare const addOrderableEndpoint: (config: SanitizedConfig, joinFieldPathsByCollection: Map<string, Map<string, string>>) => void;
//# sourceMappingURL=index.d.ts.map