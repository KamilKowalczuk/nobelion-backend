import type { Field } from '../fields/config/types.js';
import type { SanitizedConfig } from '../index.js';
import type { JsonObject } from '../types/index.js';
type MergeDataToSelectedLocalesArgs = {
    configBlockReferences: SanitizedConfig['blocks'];
    dataWithLocales: JsonObject;
    docWithLocales: JsonObject;
    fields: Field[];
    parentIsLocalized?: boolean;
    selectedLocales: string[];
};
/**
 * Merges data from dataWithLocales onto docWithLocales for specified locales.
 * For localized fields, merges only the specified locales while preserving others.
 * For non-localized fields, keeps existing values from docWithLocales unchanged.
 * Returns a new object without mutating the original.
 */
export declare function mergeLocalizedData({ configBlockReferences, dataWithLocales, docWithLocales, fields, parentIsLocalized, selectedLocales, }: MergeDataToSelectedLocalesArgs): JsonObject;
export {};
//# sourceMappingURL=mergeLocalizedData.d.ts.map