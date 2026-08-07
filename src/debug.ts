export function hasDebugQuery(search: string): boolean {
    return new URLSearchParams(search).has('debug');
}
