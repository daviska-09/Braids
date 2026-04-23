// ─── Art Institute of Chicago API — compatibility layer ───────────────────────
// Components import from here. Implementation lives in src/services/aicService.ts.

import { type ArticObject, type ArtworkObject, adaptAICObject } from "@/types/artwork";
import { getAICObject, getAICBatch, searchAICObjects } from "@/services/aicService";

export type { ArticObject };

// ─── articObjectToArtwork ─────────────────────────────────────────────────────
// Kept for any callers that use it directly. Delegates to the canonical adapter.

export function articObjectToArtwork(obj: ArticObject): ArtworkObject {
  return adaptAICObject(obj) ?? {
    id: String(obj.id),
    source: "aic" as const,
    title: obj.title || "",
    artist: obj.artist_title || "",
    artistBio: "",
    date: obj.date_display || "",
    culture: obj.place_of_origin || "",
    country: "",
    region: "",
    artistNationality: "",
    medium: obj.medium_display || "",
    dimensions: obj.dimensions || "",
    classification: obj.artwork_type_title || "",
    department: obj.department_title || "",
    credit: obj.credit_line || "",
    imageSmall: "",
    imageFull: "",
    objectUrl: `https://www.artic.edu/artworks/${obj.id}`,
    museum: "Art Institute of Chicago",
    tags: [],
  };
}

// ─── fetchArticObject ─────────────────────────────────────────────────────────

export async function fetchArticObject(
  id: number,
  signal?: AbortSignal
): Promise<ArtworkObject | null> {
  return getAICObject(id, signal);
}

// ─── searchArticObjects ───────────────────────────────────────────────────────

export async function searchArticObjects(
  query: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ ids: number[]; total: number }> {
  return searchAICObjects(query, options);
}

// ─── ID pool loaders ──────────────────────────────────────────────────────────

export async function fetchAicTextileIds(): Promise<number[]> {
  const res = await fetch("/aic-textile-ids.json").catch(() => null);
  if (!res?.ok) return [];
  return res.json() as Promise<number[]>;
}

export async function fetchAicLaceIds(): Promise<number[]> {
  const res = await fetch("/aic-lace-ids.json").catch(() => null);
  if (!res?.ok) return [];
  return res.json() as Promise<number[]>;
}

export { getAICBatch };
