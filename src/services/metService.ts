import { type ArtworkObject, type MetObject, adaptMetObject } from "@/types/artwork";
import { cacheGet, cacheSet } from "@/utils/artworkCache";
import { fetchWithConcurrency } from "@/utils/concurrentFetch";

const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Concurrency limit for Met API — conservative to avoid 429s
const MET_CONCURRENCY = 5;

const EXCLUDED_DEPARTMENTS = [
  "paintings",
  "drawings and prints",
  "photographs",
  "european paintings",
  "american paintings and sculpture",
];
const EXCLUDED_CLASSIFICATIONS = ["painting", "drawing", "print", "photograph"];

// ─── Semaphore ────────────────────────────────────────────────────────────────
// Module-level concurrency gate — limits simultaneous in-flight Met requests
// regardless of how many callers invoke getMetObject concurrently.

let inFlight = 0;
const semQueue: (() => void)[] = [];

async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight < MET_CONCURRENCY) {
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

// ─── Error classification ─────────────────────────────────────────────────────

type ApiError = "abort" | "not_found" | "rate_limit" | "server_error" | "network";

function classifyStatus(status: number): ApiError {
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server_error";
  return "network";
}

function jitter(base: number): number {
  return base + Math.random() * base * 0.5;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Fetch raw MetObject with error handling + 429 backoff ───────────────────

async function fetchRawMetObject(
  id: number,
  signal?: AbortSignal
): Promise<MetObject | null> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 10000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) return null;
    try {
      const res = await fetch(`${BASE}/objects/${id}`, { signal });

      if (res.status === 404) return null; // Normal — don't log

      if (res.status === 429) {
        const hasMoreAttempts = attempt < MAX_RETRIES;
        if (!hasMoreAttempts) return null;
        const backoff = Math.min(jitter(BASE_DELAY_MS * Math.pow(2, attempt)), MAX_DELAY_MS);
        await delay(backoff);
        continue;
      }

      if (res.status >= 500) {
        console.error("[metService] server error", { source: "met", objectId: id, status: res.status });
        if (attempt < MAX_RETRIES) {
          await delay(jitter(BASE_DELAY_MS));
          continue;
        }
        return null;
      }

      if (!res.ok) return null;

      const obj = await res.json() as MetObject;
      return obj;
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
 * Fetches a single Met object and returns it as a normalised ArtworkObject.
 * Returns null if the object lacks an image, has an excluded department/
 * classification, or if the request fails.
 */
export async function getMetObject(
  id: number,
  signal?: AbortSignal
): Promise<ArtworkObject | null> {
  const cacheKey = `met:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  return withSemaphore(async () => {
    // Re-check cache inside semaphore — another concurrent call may have
    // populated it while this one was waiting in the queue.
    const hot = cacheGet(cacheKey);
    if (hot) return hot;

    const raw = await fetchRawMetObject(id, signal);
    if (!raw) return null;

    const dept = (raw.department || "").toLowerCase();
    const cls = (raw.classification || "").toLowerCase();
    if (
      EXCLUDED_DEPARTMENTS.includes(dept) ||
      EXCLUDED_CLASSIFICATIONS.some((ex) => cls.includes(ex))
    ) {
      return null;
    }

    const artwork = adaptMetObject(raw);
    if (!artwork) return null;

    cacheSet(cacheKey, artwork);
    return artwork;
  });
}

/**
 * Fetches a raw MetObject (bypassing department/classification filtering).
 * Used by the deep-link modal which needs to open any Met object by ID.
 */
export async function getRawMetObject(
  id: number,
  signal?: AbortSignal
): Promise<MetObject | null> {
  return fetchRawMetObject(id, signal);
}

/**
 * Fetches a batch of Met objects with bounded concurrency.
 * Returns only successfully resolved, non-null artworks.
 */
export async function getMetBatch(
  ids: number[],
  signal?: AbortSignal
): Promise<ArtworkObject[]> {
  const tasks = ids.map((id) => () => getMetObject(id, signal));
  const results = await fetchWithConcurrency(tasks, MET_CONCURRENCY);
  return results.filter((r): r is ArtworkObject => r != null);
}

/**
 * Loads the pre-seeded Met textile ID pool from public JSON.
 * Shuffles on every call for variety. Caches in sessionStorage to avoid
 * re-fetching the JSON within the same session.
 */
const SESSION_IDS_KEY = "met_textile_ids";

export async function getMetTextileIds(): Promise<number[]> {
  const stored = sessionStorage.getItem(SESSION_IDS_KEY);
  const ids: number[] = stored
    ? (JSON.parse(stored) as number[])
    : await fetch("/textile-ids.json").then((r) => r.json() as Promise<number[]>);

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  if (!stored) sessionStorage.setItem(SESSION_IDS_KEY, JSON.stringify(ids));
  return ids;
}
