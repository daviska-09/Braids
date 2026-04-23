import { type ArtworkObject, type ArticObject, adaptAICObject } from "@/types/artwork";
import { cacheGet, cacheSet } from "@/utils/artworkCache";
import { fetchWithConcurrency } from "@/utils/concurrentFetch";

const BASE = "https://api.artic.edu/api/v1";
const AIC_CONCURRENCY = 4;

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

// ─── Semaphore ────────────────────────────────────────────────────────────────

let inFlight = 0;
const semQueue: (() => void)[] = [];

async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight < AIC_CONCURRENCY) {
    inFlight++;
    try {
      return await fn();
    } finally {
      inFlight--;
      semQueue.shift()?.();
    }
  }
  return new Promise<T>((resolve, reject) => {
    semQueue.push(() => {
      withSemaphore(fn).then(resolve, reject);
    });
  });
}

// ─── Error handling ───────────────────────────────────────────────────────────

function jitter(base: number): number {
  return base + Math.random() * base * 0.5;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRawAICObject(
  id: number,
  signal?: AbortSignal
): Promise<ArticObject | null> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch(`${BASE}/artworks/${id}?fields=${FIELDS}`, { signal });

      if (res.status === 404) return null;

      if (res.status === 429) {
        if (attempt < MAX_RETRIES) {
          await delay(Math.min(jitter(1000 * Math.pow(2, attempt)), 10000));
          continue;
        }
        return null;
      }

      if (res.status >= 500) {
        console.error("[aicService] server error", { source: "aic", objectId: id, status: res.status });
        if (attempt < MAX_RETRIES) {
          await delay(jitter(1000));
          continue;
        }
        return null;
      }

      if (!res.ok) return null;

      const { data } = await res.json() as { data: ArticObject };
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      if (attempt < MAX_RETRIES) {
        await delay(jitter(800 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches a single AIC artwork and returns it as a normalised ArtworkObject.
 * Returns null if the artwork lacks an image or if the request fails.
 */
export async function getAICObject(
  id: number,
  signal?: AbortSignal
): Promise<ArtworkObject | null> {
  const cacheKey = `aic:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  return withSemaphore(async () => {
    const hot = cacheGet(cacheKey);
    if (hot) return hot;

    const raw = await fetchRawAICObject(id, signal);
    if (!raw) return null;

    const artwork = adaptAICObject(raw);
    if (!artwork) return null;

    cacheSet(cacheKey, artwork);
    return artwork;
  });
}

/**
 * Fetches a batch of AIC artworks with bounded concurrency.
 */
export async function getAICBatch(
  ids: number[],
  signal?: AbortSignal
): Promise<ArtworkObject[]> {
  const tasks = ids.map((id) => () => getAICObject(id, signal));
  const results = await fetchWithConcurrency(tasks, AIC_CONCURRENCY);
  return results.filter((r): r is ArtworkObject => r != null);
}

/**
 * Searches AIC artworks by query string. Returns IDs and total count.
 * Uses its own AbortController — pass signal to cancel.
 */
export async function searchAICObjects(
  query: string,
  options: { limit?: number; page?: number; signal?: AbortSignal } = {}
): Promise<{ ids: number[]; total: number }> {
  const { limit = 100, page = 1, signal } = options;
  try {
    const res = await fetch(
      `${BASE}/artworks/search?q=${encodeURIComponent(query)}&fields=id&limit=${limit}&page=${page}`,
      { signal }
    );
    if (!res.ok) return { ids: [], total: 0 };
    const { data, pagination } = await res.json() as {
      data: { id: number }[];
      pagination: { total: number };
    };
    return {
      ids: data.map((d) => d.id),
      total: pagination.total,
    };
  } catch {
    return { ids: [], total: 0 };
  }
}
