const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";


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

const SESSION_IDS_KEY = "met_textile_ids";

export async function fetchTextileObjectIds(): Promise<number[]> {

  const stored = sessionStorage.getItem(SESSION_IDS_KEY);
  const ids: number[] = stored ? JSON.parse(stored) : await fetch('/textile-ids.json').then((r) => r.json());

  // Shuffle every call for variety on each page load / refresh
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  if (!stored) sessionStorage.setItem(SESSION_IDS_KEY, JSON.stringify(ids));
  cachedObjectIds = ids;
  return ids;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchObject(id: number, retries = 2, signal?: AbortSignal): Promise<MetObject | null> {
  if (objectCache.has(id)) return objectCache.get(id)!;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch(`${BASE}/objects/${id}`, { signal });
      if (res.status === 429) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const obj: MetObject = await res.json();
      if (!obj.primaryImageSmall || !obj.primaryImage) return null;
      const dept = (obj.department || "").toLowerCase();
      const cls = (obj.classification || "").toLowerCase();
      if (EXCLUDED_DEPARTMENTS.includes(dept) || EXCLUDED_CLASSIFICATIONS.some(ex => cls.includes(ex))) return null;
      objectCache.set(id, obj);
      return obj;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      if (attempt < retries) {
        await delay(800 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function fetchBatch(ids: number[], signal?: AbortSignal): Promise<MetObject[]> {
  const settled = await Promise.all(ids.map(id => fetchObject(id, 2, signal)));
  return settled.filter((obj): obj is MetObject => obj !== null);
}
