// ─── Met Museum API — compatibility layer ─────────────────────────────────────
// Components import from here. Implementation lives in src/services/metService.ts.
// Do not inline fetch logic here — add it to the service instead.

import { type MetObject, type ArtworkObject } from "@/types/artwork";
import { getRawMetObject, getMetObject, getMetTextileIds, getMetBatch } from "@/services/metService";

// Re-export MetObject so existing importers keep working
export type { MetObject };

// ─── fetchTextileObjectIds ────────────────────────────────────────────────────
// Kept as-is: loads from public JSON, shuffles, sessionStorage-caches.

export async function fetchTextileObjectIds(): Promise<number[]> {
  return getMetTextileIds();
}

// ─── fetchObject ──────────────────────────────────────────────────────────────
// Returns the raw MetObject shape that Gallery.tsx's deep-link feature expects.
// The `retries` param is accepted for API compatibility but the service controls
// its own retry policy (exponential backoff, max 3 attempts).

export async function fetchObject(
  id: number,
  _retries = 2,
  signal?: AbortSignal
): Promise<MetObject | null> {
  return getRawMetObject(id, signal);
}

// ─── fetchBatch ───────────────────────────────────────────────────────────────
// Returns normalised ArtworkObjects. Callers that previously consumed MetObject
// from fetchBatch should migrate to the service directly.

export async function fetchBatch(
  ids: number[],
  signal?: AbortSignal
): Promise<ArtworkObject[]> {
  return getMetBatch(ids, signal);
}

// ─── getMetObjectAsArtwork ────────────────────────────────────────────────────
// Convenience for callers that want a normalised ArtworkObject for a single ID.

export async function getMetObjectAsArtwork(
  id: number,
  signal?: AbortSignal
): Promise<ArtworkObject | null> {
  return getMetObject(id, signal);
}
