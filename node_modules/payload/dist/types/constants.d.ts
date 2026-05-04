export declare const validOperators: readonly ["equals", "contains", "not_equals", "in", "all", "not_in", "exists", "greater_than", "greater_than_equal", "less_than", "less_than_equal", "like", "not_like", "within", "intersects", "near"];
export type Operator = (typeof validOperators)[number];
export declare const validOperatorSet: Set<"all" | "contains" | "equals" | "exists" | "intersects" | "near" | "within" | "not_equals" | "in" | "not_in" | "greater_than" | "greater_than_equal" | "less_than" | "less_than_equal" | "like" | "not_like">;
/**
 * Matches a dot-separated path where each segment is a word character (a-zA-Z0-9_).
 * Used to validate field paths before they are processed by query builders.
 */
export declare const SAFE_FIELD_PATH_REGEX: RegExp;
//# sourceMappingURL=constants.d.ts.map