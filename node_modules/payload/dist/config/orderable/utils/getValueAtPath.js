/**
 * Reads a nested value from an object using dot-notation path syntax.
 */ export function getValueAtPath(data, path) {
    if (!data || typeof data !== 'object') {
        return undefined;
    }
    const segments = path.split('.');
    let currentValue = data;
    for (const segment of segments){
        if (!currentValue || typeof currentValue !== 'object') {
            return undefined;
        }
        currentValue = currentValue[segment];
    }
    return currentValue;
}

//# sourceMappingURL=getValueAtPath.js.map