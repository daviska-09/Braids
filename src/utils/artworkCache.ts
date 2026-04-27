import { type ArtworkObject, CACHE_VERSION } from "@/types/artwork";

// ─── LRU cache ───────────────────────────────────────────────────────────────
// JavaScript Maps maintain insertion order. We exploit that for O(1) LRU:
// on every get we delete + re-insert the entry (moves it to the "newest" end),
// on overflow we delete the first (oldest) entry.

const MAX_ENTRIES = 150;
const LS_KEY = "reel_cache_v1";
const LS_VERSION_KEY = "reel_cache_version";

const mem = new Map<string, ArtworkObject>();

// ─── localStorage hydration ──────────────────────────────────────────────────

function hydrateFromStorage(): void {
  try {
    const storedVersion = localStorage.getItem(LS_VERSION_KEY);
    if (storedVersion !== String(CACHE_VERSION)) {
      localStorage.removeItem(LS_KEY);
      localStorage.setItem(LS_VERSION_KEY, String(CACHE_VERSION));
      return;
    }
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, ArtworkObject][];
    for (const [key, obj] of entries) {
      if (obj && obj.imageSmall) mem.set(key, obj);
    }
  } catch {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }
}

function persistToStorage(): void {
  try {
    // Only persist entries that have a valid image URL
    const entries = [...mem.entries()].filter(([, v]) => !!v.imageSmall);
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch { /* quota — fail silently */ }
}

// Debounce localStorage writes to avoid thrashing on rapid sequential sets
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(): void {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistToStorage();
  }, 1000);
}

// Hydrate once when the module is first imported
hydrateFromStorage();

// ─── Public API ──────────────────────────────────────────────────────────────

export function cacheGet(key: string): ArtworkObject | null {
  const obj = mem.get(key);
  if (!obj) return null;
  // LRU: move to newest position
  mem.delete(key);
  mem.set(key, obj);
  return obj;
}

export function cacheSet(key: string, obj: ArtworkObject): void {
  if (mem.has(key)) mem.delete(key);
  mem.set(key, obj);
  // Evict oldest entry when over capacity
  if (mem.size > MAX_ENTRIES) {
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  schedulePersist();
}

export function cacheHas(key: string): boolean {
  return mem.has(key);
}

/** Expose the raw map size for diagnostics. Not used in production paths. */
export function cacheSize(): number {
  return mem.size;
}
