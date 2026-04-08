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

const EXCLUDED_DEPARTMENTS = ["paintings", "drawings and prints", "photographs", "european paintings", "american paintings and sculpture"];
const EXCLUDED_CLASSIFICATIONS = ["painting", "drawing", "print", "photograph"];

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

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchObject(id: number, retries = 2): Promise<MetObject | null> {
  if (objectCache.has(id)) return objectCache.get(id)!;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}/objects/${id}`);
      if (res.status === 429) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const obj: MetObject = await res.json();
      if (!obj.primaryImageSmall) return null;
      const dept = (obj.department || "").toLowerCase();
      const cls = (obj.classification || "").toLowerCase();
      if (EXCLUDED_DEPARTMENTS.includes(dept) || EXCLUDED_CLASSIFICATIONS.some(ex => cls.includes(ex))) return null;
      objectCache.set(id, obj);
      return obj;
    } catch {
      if (attempt < retries) {
        await delay(800 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function fetchBatch(ids: number[], batchSize = 6): Promise<MetObject[]> {
  const results: MetObject[] = [];
  const batch = ids.slice(0, batchSize);
  // Process in small chunks of 4 to avoid rate limits
  const chunkSize = 4;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const resolved = await Promise.all(chunk.map((id) => fetchObject(id)));
    for (const obj of resolved) {
      if (obj) results.push(obj);
    }
    if (i + chunkSize < batch.length) await delay(200);
  }
  return results;
}
