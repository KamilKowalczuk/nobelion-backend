type ProfileEntry = {
    calls: number;
    duration: number;
    name: string;
};
export declare const timeSync: <T>(name: string, fn: () => T) => T;
export declare const timeAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
export declare const clearProfiles: () => void;
export declare const printProfileResults: () => void;
export declare const getProfileResults: () => ProfileEntry[];
export {};
//# sourceMappingURL=profiling.d.ts.map