/**
 * Safe string coercion for untyped webhook payload fields. Returns '' for
 * objects/null/undefined so we never accidentally stringify to
 * '[object Object]'.
 */
export const asString = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : typeof value === 'number'
      ? String(value)
      : '';
