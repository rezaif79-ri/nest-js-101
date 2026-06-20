/**
 * URL-/cache-key-friendly slug helpers shared by every entity that derives a
 * slug from a human-readable name (products, categories, ...).
 */

/**
 * Builds a URL-safe slug from arbitrary text: lowercased, accent-folded, with
 * every run of non-alphanumerics collapsed to a single hyphen and the result
 * trimmed and capped at 80 chars. Returns `fallback` when the input slugifies
 * to empty (e.g. an all-symbol title).
 */
export function slugify(text: string, fallback = 'item'): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || fallback
  );
}

/**
 * Guarantees a unique slug by appending a short random suffix on collision.
 * `exists` reports whether a candidate slug is already taken (typically a
 * repository `exists` lookup).
 */
export async function generateUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  while (await exists(candidate)) {
    candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  return candidate;
}
