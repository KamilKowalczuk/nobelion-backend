/**
 * Template for localizeStatus migration
 * Transforms version._status from single value to per-locale object
 */
export declare const localizeStatusTemplate: (options: {
    collectionSlug?: string;
    dbType: "mongodb" | "postgres" | "sqlite";
    globalSlug?: string;
}) => string;
//# sourceMappingURL=localizeStatus.d.ts.map