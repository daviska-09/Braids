import { type ArtworkObject, adaptEuropeanaItem } from "@/types/artwork";
import { cacheGet, cacheSet } from "@/utils/artworkCache";

const BASE = "https://api.europeana.eu/record/v2/search.json";
const API_KEY = import.meta.env.VITE_EUROPEANA_API_KEY as string;

// Europeana handles more parallel connections than Met
const EUROPEANA_ROWS = 9;

const COLLECTION_QUERY =
  "(textile OR weaving OR tapestry OR embroidery OR costume OR fabric OR silk OR wool OR carpet OR brocade) AND NOT (lace OR crochet)";

const LACE_QUERY =
  'lace OR crochet OR needlework OR "bobbin lace" OR "needle lace" OR tatting OR lacework OR "Irish crochet"';

const IRISH_LACE_QUERY =
  '"irish lace" OR "irish crochet" OR "Carrickmacross" OR "Limerick lace" OR "Kenmare lace" OR lace OR crochet OR tatting OR lacework';

// ─── Caching ─────────────────────────────────────────────────────────────────
// Individual items go into the shared LRU cache.
// Page-level index (array of IDs) stays in sessionStorage so it survives
// component unmounts without polluting localStorage with ephemeral page state.

function ssGetPage(pageKey: string): ArtworkObject[] | null {
  try {
    const raw = sessionStorage.getItem(pageKey);
    if (!raw) return null;
    const ids = JSON.parse(raw) as string[];
    const items = ids.map((id) => cacheGet(`europeana:${id}`));
    return items.every((x): x is ArtworkObject => x !== null) ? items : null;
  } catch { return null; }
}

function ssSavePage(pageKey: string, artworks: ArtworkObject[]): void {
  for (const a of artworks) cacheSet(`europeana:${a.id}`, a);
  try {
    sessionStorage.setItem(pageKey, JSON.stringify(artworks.map((a) => a.id)));
  } catch { /* quota */ }
}

// ─── Error handling ───────────────────────────────────────────────────────────

function jitter(base: number): number {
  return base + Math.random() * base * 0.5;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function fetchEuropeana(
  query: string,
  page: number,
  irishOnly: boolean,
  cacheKey: string,
  signal?: AbortSignal
): Promise<ArtworkObject[]> {
  const pageKey = `${cacheKey}:p${page}`;
  const cached = ssGetPage(pageKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    wskey: API_KEY,
    query,
    rows: String(EUROPEANA_ROWS),
    start: String((page - 1) * EUROPEANA_ROWS + 1),
    profile: "rich",
  });
  params.append("qf", "TYPE:IMAGE");
  params.append("reusability", "open");
  params.append("reusability", "permission");
  if (irishOnly) params.append("qf", "COUNTRY:ireland");

  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) return [];
    try {
      const res = await fetch(`${BASE}?${params}`, { signal });

      if (res.status === 404) return [];

      if (res.status === 429) {
        if (attempt < MAX_RETRIES) {
          await delay(Math.min(jitter(1000 * Math.pow(2, attempt)), 10000));
          continue;
        }
        return [];
      }

      if (res.status >= 500) {
        console.error("[europeanaService] server error", { source: "europeana", page, status: res.status });
        if (attempt < MAX_RETRIES) {
          await delay(jitter(1000));
          continue;
        }
        return [];
      }

      if (!res.ok) return [];

      const json = await res.json() as { items?: Record<string, unknown>[] };
      const artworks = (json.items ?? [])
        .map(adaptEuropeanaItem)
        .filter((x): x is ArtworkObject => x !== null);

      ssSavePage(pageKey, artworks);
      return artworks;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return [];
      if (attempt < MAX_RETRIES) {
        await delay(jitter(800));
        continue;
      }
      return [];
    }
  }
  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function fetchEuropeanaCollection(page: number, signal?: AbortSignal): Promise<ArtworkObject[]> {
  return fetchEuropeana(COLLECTION_QUERY, page, false, "europeana:collection", signal);
}

export function fetchEuropeanaLace(page: number, irishOnly: boolean, signal?: AbortSignal): Promise<ArtworkObject[]> {
  return fetchEuropeana(
    irishOnly ? IRISH_LACE_QUERY : LACE_QUERY,
    page,
    irishOnly,
    irishOnly ? "europeana:irishlace" : "europeana:lace",
    signal
  );
}
