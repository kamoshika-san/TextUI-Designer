export function sortObjectKeys<T>(value: Record<string, T>): Array<[string, T]> {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}

export function sanitizeId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'generated-page';
}
