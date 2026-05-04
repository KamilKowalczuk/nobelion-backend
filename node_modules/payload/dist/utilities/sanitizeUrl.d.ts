/**
 * Sanitizes a URL to ensure only allowed protocols are used.
 * Allows: http, https, mailto, tel, relative paths, and fragment (#) URLs.
 * Returns '#' for any URL with a disallowed protocol (e.g. javascript:, data:).
 */
export declare function sanitizeUrl(url: string): string;
//# sourceMappingURL=sanitizeUrl.d.ts.map