const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

const TEXTILE_QUERIES = [
  "textile", "embroidery", "silk", "weaving", "lace", "garment",
  "dress", "costume", "tapestry", "quilt", "braid", "knitting",
];

export interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  objectDate: string;
  medium: string;
  department: string;
  culture: string;
  country: string;
  city: string;
  primaryImageSmall: string;
  primaryImage: string;
  objectURL: string;
  dimensions: string;
  creditLine: string;
  repository: string;
  classification: string;
  period: string;
  dynasty: string;
  reign: string;
  artistGender: string;
  artistNationality: string;
  geographyType: string;
  locale: string;
  locus: string;
  excavation: string;
  river: string;
  region: string;
  subregion: string;
  county: string;
  state: string;
  tags: { term: string; AAT_URL: string; Wikidata_URL: string }[] | null;
}

const objectCache = new Map<number, MetObject>();
let cachedObjectIds: number[] | null = null;

export async function fetchTextileObjectIds(): Promise<number[]> {
  if (cachedObjectIds) return cachedObjectIds;

  const allIds = new Set<number>();
  const promises = TEXTILE_QUERIES.map(async (q) => {
    try {
      const res = await fetch(`${BASE}/search?hasImages=true&q=${q}`);
      const data = await res.json();
      if (data.objectIDs) {
        data.objectIDs.forEach((id: number) => allIds.add(id));
      }
    } catch {
      // skip failed queries
    }
  });
  await Promise.all(promises);

  const ids = Array.from(allIds);
  // Shuffle for variety
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  cachedObjectIds = ids;
  return ids;
}

export async function fetchObject(id: number): Promise<MetObject | null> {
  if (objectCache.has(id)) return objectCache.get(id)!;
  try {
    const res = await fetch(`${BASE}/objects/${id}`);
    if (!res.ok) return null;
    const obj: MetObject = await res.json();
    if (!obj.primaryImageSmall) return null;
    objectCache.set(id, obj);
    return obj;
  } catch {
    return null;
  }
}

export async function fetchBatch(ids: number[], batchSize = 6): Promise<MetObject[]> {
  const results: MetObject[] = [];
  const batch = ids.slice(0, batchSize);
  const promises = batch.map((id) => fetchObject(id));
  const resolved = await Promise.all(promises);
  for (const obj of resolved) {
    if (obj) results.push(obj);
  }
  return results;
}
