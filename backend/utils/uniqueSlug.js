/**
 * URL slugs stay unique; display names do not have to.
 * Two shops can both sell "Scarf" — URLs become /addons/scarf and /addons/scarf-2.
 */

export function slugifyName(input, fallback = "item") {
  const slug = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export async function ensureUniqueSlug(
  Model,
  desired,
  { excludeId = null, extraFilter = {}, fallback = "item" } = {},
) {
  const base = slugifyName(desired, fallback);
  let candidate = base;
  let n = 2;

  const isTaken = async (slug) => {
    const filter = { slug, ...extraFilter };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return Boolean(await Model.exists(filter));
  };

  while (await isTaken(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 500) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}
