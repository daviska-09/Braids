// ─── Textile filter predicates — compatibility re-exports ────────────────────
// Single source of truth is src/utils/laceFilter.ts.
// This file keeps the legacy export names so existing component imports
// (Gallery.tsx, LaceArchive.tsx) continue to work without modification.

import type { ArtworkObject } from "@/types/artwork";
import { isLace, isCollection, LACE_KEYWORDS, COLLECTION_EXCLUDE_KEYWORDS } from "@/utils/laceFilter";

export { LACE_KEYWORDS, COLLECTION_EXCLUDE_KEYWORDS };

export function isLacePiece(item: ArtworkObject): boolean {
  return isLace(item);
}

export function isCollectionPiece(item: ArtworkObject): boolean {
  return isCollection(item);
}
