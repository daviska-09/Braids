// ─── Shared artwork types and routing ────────────────────────────────────────
// `Artwork` is now a type alias for the canonical `ArtworkObject` so that
// existing component imports continue to work without modification.

import { type ArtworkObject, type MetObject, adaptMetObject } from "@/types/artwork";
import { getMetObject } from "@/services/metService";
import { getAICObject } from "@/services/aicService";

// Re-export the canonical type under the legacy name so TSX imports stay valid.
export type Artwork = ArtworkObject;

// Re-export MetObject for callers that still reference it via this module.
export type { MetObject };

// ─── Adapter (kept for Gallery.tsx deep-link: fromMetObject(obj)) ─────────────
export function fromMetObject(obj: MetObject): ArtworkObject {
  return (
    adaptMetObject(obj) ?? {
      id: String(obj.objectID),
      source: "met" as const,
      title: obj.title || "",
      artist: obj.artistDisplayName || "",
      artistBio: obj.artistDisplayBio || "",
      date: obj.objectDate || "",
      culture: obj.culture || "",
      country: obj.country || "",
      region: obj.region || "",
      artistNationality: obj.artistNationality || "",
      medium: obj.medium || "",
      dimensions: obj.dimensions || "",
      classification: obj.classification || "",
      department: obj.department || "",
      credit: obj.creditLine || "",
      imageSmall: obj.primaryImageSmall || "",
      imageFull: obj.primaryImage || "",
      objectUrl: obj.objectURL || "",
      museum: "The Metropolitan Museum of Art",
      tags: obj.tags ? obj.tags.map((t) => t.term) : [],
    }
  );
}

// ─── TaggedId — identifies an artwork by museum source ───────────────────────
export type TaggedId = { id: number; museum: "met" | "aic" };

// ─── fetchArtwork — main dispatch used by Gallery and LaceArchive ─────────────
export async function fetchArtwork(
  item: TaggedId,
  _retries: number,
  signal: AbortSignal
): Promise<ArtworkObject | null> {
  if (item.museum === "aic") {
    return getAICObject(item.id, signal);
  }
  return getMetObject(item.id, signal);
}

// ─── interleave — distributes secondary items evenly through primary ──────────
export function interleave<T>(primary: T[], secondary: T[]): T[] {
  if (secondary.length === 0) return primary;
  const result: T[] = [];
  const interval = Math.max(1, Math.floor(primary.length / secondary.length));
  let secIdx = 0;
  for (let i = 0; i < primary.length; i++) {
    result.push(primary[i]);
    if (secIdx < secondary.length && (i + 1) % interval === 0) {
      result.push(secondary[secIdx++]);
    }
  }
  while (secIdx < secondary.length) result.push(secondary[secIdx++]);
  return result;
}
