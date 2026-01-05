export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // normalize unicode (é -> e, etc)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // replace & with "and"
    .replace(/&/g, " and ")
    // keep letters/numbers, turn the rest into "-"
    .replace(/[^a-z0-9]+/g, "-")
    // remove leading/trailing "-"
    .replace(/^-+|-+$/g, "")
    // collapse multiple "-"
    .replace(/-+/g, "-");
}