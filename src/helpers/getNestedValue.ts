export function getNestedPropertyValue(obj: any, path: string): any {
    const keys = path.split('.');
    return keys.reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}