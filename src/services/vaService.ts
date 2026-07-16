import { type ArtworkObject, type VARecord, adaptVARecord } from "@/types/artwork";
import { cacheGet, cacheSet } from "@/utils/artworkCache";

const BASE = "https://api.vam.ac.uk/v2/objects/search";
const VA_PAGE_SIZE = 15;

// Alternate between textile and fashion queries for variety across batches
const VA_QUERIES = [
  "textile embroidery weaving tapestry brocade",
  "costume dress garment clothing fashion",
  "silk wool linen cotton velvet fabric",
  "sampler needlework knitting carpet rug",
];

// ─── Session-level page cache ─────────────────────────────────────────────────

function ssGetPage(pageKey: string): ArtworkObject[] | null {
  try {
    const raw = sessionStorage.getItem(pageKey);
    if (!raw) return null;
    const ids = JSON.parse(raw) as string[];
    const items = ids.map((id) => cacheGet(`va:${id}`));
    if (!items.every((x): x is ArtworkObject => x !== null)) return null;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items as ArtworkObject[];
  } catch { return null; }
}

function ssSavePage(pageKey: string, artworks: ArtworkObject[]): void {
  for (const a of artworks) cacheSet(`va:${a.id}`, a);
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

async function fetchVAPage(
  query: string,
  page: number,
  cacheKey: string,
  signal?: AbortSignal
): Promise<ArtworkObject[]> {
  const pageKey = `${cacheKey}:p${page}`;
  const cached = ssGetPage(pageKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    page_size: String(VA_PAGE_SIZE),
    page: String(page),
    images_exist: "1",
    order_sort: "random",
  });

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
        console.error("[vaService] server error", { status: res.status, page });
        if (attempt < MAX_RETRIES) {
          await delay(jitter(1000));
          continue;
        }
        return [];
      }

      if (!res.ok) return [];

      const json = await res.json() as { records?: VARecord[] };
      const artworks = (json.records ?? [])
        .map(adaptVARecord)
        .filter((x): x is ArtworkObject => x !== null);

      for (let i = artworks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [artworks[i], artworks[j]] = [artworks[j], artworks[i]];
      }

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

/** Pick a random query from the rotation and fetch one page of V&A textiles. */
export function fetchVATextiles(page: number, signal?: AbortSignal): Promise<ArtworkObject[]> {
  const query = VA_QUERIES[Math.floor(Math.random() * VA_QUERIES.length)];
  const cacheKey = `va:${query.split(" ")[0]}`;
  return fetchVAPage(query, page, cacheKey, signal);
}

/** Call on Gallery mount to bust stale V&A page cache. */
export function clearVACache(): void {
  try {
    const toRemove = Object.keys(sessionStorage).filter((k) => k.startsWith("va:"));
    for (const k of toRemove) sessionStorage.removeItem(k);
  } catch { /* ignore */ }
}
