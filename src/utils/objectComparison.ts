export const deepEqual = <T extends Record<string, any>>(obj1: Partial<T>, obj2: Partial<T>): boolean => {
    const keys1 = Object.keys(obj1) as Array<keyof T>;
    const keys2 = Object.keys(obj2) as Array<keyof T>;

    if (keys1.length !== keys2.length) {
        return false;
    }

    return keys1.every((key) => {
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (typeof val1 === 'object' && typeof val2 === 'object') {
            if (val1 === null || val2 === null) {
                return val1 === val2;
            }
            return deepEqual(val1, val2);
        }

        return val1 === val2;
    });
};