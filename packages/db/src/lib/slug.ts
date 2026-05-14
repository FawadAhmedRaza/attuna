export const SLUG_MIN = 2;
export const SLUG_MAX = 64;

/**
 * Normalizes a freeform name into a workspace slug.
 *   "Karachi Therapy Collective" → "karachi-therapy-collective"
 *   "Dr. Smith's --- Practice"   → "dr-smith-s-practice"
 *
 * Result may be empty if the input has no alphanumerics; callers
 * must check before persisting.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}
