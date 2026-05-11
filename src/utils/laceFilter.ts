import type { ArtworkObject } from "@/types/artwork";

// ─── Keyword lists ────────────────────────────────────────────────────────────

export const LACE_KEYWORDS: readonly string[] = [
  "lace",
  "crochet",
  "needlepoint lace",
  "bobbin lace",
  "needle lace",
  "tatting",
  "lacework",
  "punto in aria",
  "reticella",
  "torchon",
  "chantilly",
  "valenciennes",
  "bruges",
  "irish crochet",
];

export const COLLECTION_EXCLUDE_KEYWORDS: readonly string[] = [
  ...LACE_KEYWORDS,
  "painting",
  "drawing",
  "print",
  "photograph",
  "book",
  "manuscript",
  "poster",
  "lithograph",
  "etching",
  "engraving",
  "woodcut",
  "sculpture",
  "statue",
  "statuette",
];

export const COLLECTION_INCLUDE_KEYWORDS: readonly string[] = [
  // Textiles
  "textile", "weaving", "woven", "weave",
  "tapestry", "embroidery", "embroidered",
  "costume", "fabric", "silk", "wool",
  "carpet", "brocade", "linen", "cotton",
  "velvet", "cloth", "thread", "fiber", "fibre",
  "dyeing", "knitting", "knitted", "sewing", "sampler",
  // Tools
  "tool", "spindle", "loom", "needle",
  "shuttle", "bobbin", "distaff", "whorl", "thimble",
];

// ─── Predicates ───────────────────────────────────────────────────────────────
// Single source of truth used by all three services and any component that
// needs to classify artworks. Always operates on the normalised ArtworkObject —
// never on raw API shapes.

/** Returns true if the artwork is a lace or crochet piece. */
export function isLace(item: ArtworkObject): boolean {
  const fields = [
    item.title,
    item.medium,
    item.classification,
    item.department,
    ...item.tags,
  ].map((f) => (f || "").toLowerCase());
  return LACE_KEYWORDS.some((kw) => fields.some((f) => f.includes(kw)));
}

/** Returns true if the artwork belongs in the general textile collection (not lace, not paintings/prints). */
export function isCollection(item: ArtworkObject): boolean {
  const fields = [
    item.title,
    item.medium,
    item.classification,
    item.department,
    ...item.tags,
  ].map((f) => (f || "").toLowerCase());
  if (COLLECTION_EXCLUDE_KEYWORDS.some((kw) => fields.some((f) => f.includes(kw)))) return false;
  return COLLECTION_INCLUDE_KEYWORDS.some((kw) => fields.some((f) => f.includes(kw)));
}

/** Returns true if the artwork has an Irish provenance. */
export function isIrish(item: ArtworkObject): boolean {
  const fields = [
    item.culture,
    item.country,
    item.artistNationality,
    item.region,
  ].map((f) => (f || "").toLowerCase());
  return fields.some((f) => f.includes("ireland") || f.includes("irish"));
}
