import type { Artwork } from "@/lib/artwork";

export const LACE_KEYWORDS = [
  "lace", "crochet", "needlepoint lace", "bobbin lace",
  "needle lace", "tatting", "lacework", "punto in aria",
  "reticella", "torchon", "chantilly", "valenciennes",
  "bruges", "irish crochet",
];

export const COLLECTION_EXCLUDE_KEYWORDS = [
  ...LACE_KEYWORDS,
  "painting", "drawing", "print", "photograph",
  "book", "manuscript", "poster", "lithograph",
  "etching", "engraving", "woodcut",
];

export function isLacePiece(item: Artwork): boolean {
  const fields = [item.title, item.medium, item.classification]
    .map((f) => (f || "").toLowerCase());
  return LACE_KEYWORDS.some((kw) => fields.some((f) => f.includes(kw)));
}

export function isCollectionPiece(item: Artwork): boolean {
  const fields = [item.title, item.medium, item.classification]
    .map((f) => (f || "").toLowerCase());
  return !COLLECTION_EXCLUDE_KEYWORDS.some((kw) => fields.some((f) => f.includes(kw)));
}
