import type { MetObject } from "./metApi";
import { fetchObject } from "./metApi";
import { fetchArticObject } from "./articApi";

export interface Artwork {
  id: number;
  title: string;
  artist: string;
  artistBio: string;
  date: string;
  culture: string;
  // Extended origin fields — populated for Met objects, empty string for AIC
  country: string;
  region: string;
  artistNationality: string;
  medium: string;
  dimensions: string;
  classification: string;
  department: string;
  credit: string;
  imageSmall: string;
  imageFull: string;
  objectUrl: string;
  museum: "The Metropolitan Museum of Art" | "Art Institute of Chicago";
}

export function fromMetObject(obj: MetObject): Artwork {
  return {
    id: obj.objectID,
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
    imageSmall: obj.primaryImageSmall,
    imageFull: obj.primaryImage,
    objectUrl: obj.objectURL,
    museum: "The Metropolitan Museum of Art",
  };
}

export type TaggedId = { id: number; museum: "met" | "aic" };

export async function fetchArtwork(
  item: TaggedId,
  retries: number,
  signal: AbortSignal
): Promise<Artwork | null> {
  if (item.museum === "aic") {
    return fetchArticObject(item.id, signal);
  }
  const obj = await fetchObject(item.id, retries, signal);
  return obj ? fromMetObject(obj) : null;
}

/** Distributes secondary items evenly throughout primary, preserving order of both. */
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
