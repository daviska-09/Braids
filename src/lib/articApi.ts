import type { Artwork } from "./artwork";

const BASE = "https://api.artic.edu/api/v1";

const FIELDS = [
  "id",
  "title",
  "artist_title",
  "date_display",
  "place_of_origin",
  "medium_display",
  "dimensions",
  "artwork_type_title",
  "department_title",
  "credit_line",
  "image_id",
].join(",");

export interface ArticObject {
  id: number;
  title: string;
  artist_title: string | null;
  date_display: string | null;
  place_of_origin: string | null;
  medium_display: string | null;
  dimensions: string | null;
  artwork_type_title: string | null;
  department_title: string | null;
  credit_line: string | null;
  image_id: string | null;
}

export function articObjectToArtwork(obj: ArticObject): Artwork {
  return {
    id: String(obj.id),
    title: obj.title || "",
    artist: obj.artist_title || "",
    artistBio: "",
    date: obj.date_display || "",
    culture: obj.place_of_origin || "",
    medium: obj.medium_display || "",
    dimensions: obj.dimensions || "",
    classification: obj.artwork_type_title || "",
    department: obj.department_title || "",
    credit: obj.credit_line || "",
    imageSmall: obj.image_id
      ? `https://www.artic.edu/iiif/2/${obj.image_id}/full/843,/0/default.jpg`
      : "",
    imageFull: obj.image_id
      ? `https://www.artic.edu/iiif/2/${obj.image_id}/full/1686,/0/default.jpg`
      : "",
    objectUrl: `https://www.artic.edu/artworks/${obj.id}`,
    museum: "Art Institute of Chicago",
  };
}

const objectCache = new Map<number, Artwork>();
const SS_PREFIX = "aic:";

function ssGet(id: number): Artwork | null {
  try {
    const s = sessionStorage.getItem(SS_PREFIX + id);
    return s ? (JSON.parse(s) as Artwork) : null;
  } catch { return null; }
}

function ssSave(id: number, artwork: Artwork) {
  try { sessionStorage.setItem(SS_PREFIX + id, JSON.stringify(artwork)); } catch { /* quota */ }
}

export async function fetchArticObject(
  id: number,
  signal?: AbortSignal
): Promise<Artwork | null> {
  if (objectCache.has(id)) return objectCache.get(id)!;
  const cached = ssGet(id);
  if (cached) { objectCache.set(id, cached); return cached; }
  try {
    const res = await fetch(`${BASE}/artworks/${id}?fields=${FIELDS}`, { signal });
    if (!res.ok) return null;
    const { data }: { data: ArticObject } = await res.json();
    if (!data.image_id) return null;
    const artwork = articObjectToArtwork(data);
    objectCache.set(id, artwork);
    ssSave(id, artwork);
    return artwork;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    return null;
  }
}

export async function searchArticObjects(
  query: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ ids: number[]; total: number }> {
  const { limit = 100, page = 1 } = options;
  try {
    const res = await fetch(
      `${BASE}/artworks/search?q=${encodeURIComponent(query)}&fields=id&limit=${limit}&page=${page}`
    );
    if (!res.ok) return { ids: [], total: 0 };
    const { data, pagination } = await res.json();
    return {
      ids: (data as { id: number }[]).map((d) => d.id),
      total: pagination.total,
    };
  } catch {
    return { ids: [], total: 0 };
  }
}
