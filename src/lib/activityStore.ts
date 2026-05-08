import { supabase } from "./supabase";
import { getUserId } from "./userIdentity";

export interface ActivityEntry {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkArtist: string;
  artworkImage: string;
  action: "saved" | "sent";
  timestamp: number;
  recipientHint?: string;
  note?: string;
  // Full artwork metadata — optional for backward compat with existing stored items
  artworkArtistBio?: string;
  artworkDate?: string;
  artworkMedium?: string;
  artworkDimensions?: string;
  artworkCulture?: string;
  artworkCountry?: string;
  artworkRegion?: string;
  artworkClassification?: string;
  artworkDepartment?: string;
  artworkCredit?: string;
  artworkObjectUrl?: string;
  artworkMuseum?: string;
  artworkSource?: "europeana";
}

const STORAGE_KEY = "curate-activity";
const EVENT_NAME = "activity-update";
const MAX_ACTIVITIES = 100;

// ─── localStorage helpers ────────────────────────────────────────────────────

// Only persist the fields needed to render cards. Full metadata lives in
// Supabase and is restored when hydrateFromSupabase runs on mount.
function slimEntry(e: ActivityEntry): ActivityEntry {
  return {
    id: e.id,
    artworkId: e.artworkId,
    artworkTitle: e.artworkTitle,
    artworkArtist: e.artworkArtist,
    artworkImage: e.artworkImage,
    action: e.action,
    timestamp: e.timestamp,
    recipientHint: e.recipientHint,
    note: e.note,
    artworkDate: e.artworkDate,
    artworkSource: e.artworkSource,
    artworkMuseum: e.artworkMuseum,
    artworkObjectUrl: e.artworkObjectUrl,
  };
}

export function getActivities(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveActivities(activities: ActivityEntry[]) {
  const slim = activities.map(slimEntry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Quota still exceeded even with slim data — drop oldest half and retry
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim.slice(0, Math.ceil(slim.length / 2))));
    } catch { /* give up on localStorage — Supabase still has everything */ }
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

// ─── Supabase row adapters ───────────────────────────────────────────────────

function toRow(entry: ActivityEntry) {
  return {
    id: entry.id,
    user_id: getUserId(),
    artwork_id: entry.artworkId,
    action: entry.action,
    timestamp: entry.timestamp,
    note: entry.note ?? null,
    recipient_hint: entry.recipientHint ?? null,
    artwork_title: entry.artworkTitle,
    artwork_artist: entry.artworkArtist ?? null,
    artwork_image: entry.artworkImage ?? null,
    artwork_artist_bio: entry.artworkArtistBio ?? null,
    artwork_date: entry.artworkDate ?? null,
    artwork_medium: entry.artworkMedium ?? null,
    artwork_dimensions: entry.artworkDimensions ?? null,
    artwork_culture: entry.artworkCulture ?? null,
    artwork_country: entry.artworkCountry ?? null,
    artwork_region: entry.artworkRegion ?? null,
    artwork_classification: entry.artworkClassification ?? null,
    artwork_department: entry.artworkDepartment ?? null,
    artwork_credit: entry.artworkCredit ?? null,
    artwork_object_url: entry.artworkObjectUrl ?? null,
    artwork_museum: entry.artworkMuseum ?? null,
    artwork_source: entry.artworkSource ?? null,
  };
}

function fromRow(row: Record<string, unknown>): ActivityEntry {
  return {
    id: row.id as string,
    artworkId: row.artwork_id as string,
    artworkTitle: row.artwork_title as string,
    artworkArtist: (row.artwork_artist as string) ?? "",
    artworkImage: (row.artwork_image as string) ?? "",
    action: row.action as "saved" | "sent",
    timestamp: row.timestamp as number,
    recipientHint: (row.recipient_hint as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    artworkArtistBio: (row.artwork_artist_bio as string) ?? undefined,
    artworkDate: (row.artwork_date as string) ?? undefined,
    artworkMedium: (row.artwork_medium as string) ?? undefined,
    artworkDimensions: (row.artwork_dimensions as string) ?? undefined,
    artworkCulture: (row.artwork_culture as string) ?? undefined,
    artworkCountry: (row.artwork_country as string) ?? undefined,
    artworkRegion: (row.artwork_region as string) ?? undefined,
    artworkClassification: (row.artwork_classification as string) ?? undefined,
    artworkDepartment: (row.artwork_department as string) ?? undefined,
    artworkCredit: (row.artwork_credit as string) ?? undefined,
    artworkObjectUrl: (row.artwork_object_url as string) ?? undefined,
    artworkMuseum: (row.artwork_museum as string) ?? undefined,
    artworkSource: (row.artwork_source as "europeana") ?? undefined,
  };
}

// ─── Supabase hydration ──────────────────────────────────────────────────────
// Called once when CurateTogether mounts. Fetches all saved items for this
// user from Supabase, merges with localStorage (Supabase wins on conflict),
// and writes the merged result back to localStorage.

export async function hydrateFromSupabase(): Promise<void> {
  try {
    const userId = getUserId();
    console.log("[hydrateFromSupabase] user_id:", userId);
    const { data, error } = await supabase
      .from("saved_items")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    console.log("[hydrateFromSupabase] rows from Supabase:", data?.length, "error:", error);
    if (error || !data) return;
    const remote = data.map(fromRow);
    const local = getActivities();

    // Merge: remote is authoritative. Add any local items not in Supabase
    // (e.g. items saved before Supabase was added).
    const remoteIds = new Set(remote.map((r) => r.id));
    const localOnly = local.filter((l) => !remoteIds.has(l.id));

    const merged = [...remote, ...localOnly]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_ACTIVITIES);

    console.log("[hydrateFromSupabase] merged total:", merged.length);
    saveActivities(merged);
  } catch (e) {
    console.warn("[hydrateFromSupabase] failed:", e);
    // Network failure — localStorage data remains intact
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function addActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
  const activities = getActivities();
  const newEntry: ActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  activities.unshift(newEntry);
  if (activities.length > MAX_ACTIVITIES) activities.length = MAX_ACTIVITIES;
  saveActivities(activities);

  // Sync to Supabase in the background (full metadata)
  supabase
    .from("saved_items")
    .insert(toRow(newEntry))
    .then(({ error }) => {
      if (error) console.warn("[activityStore] Supabase insert failed:", error);
    });
}

export function updateNote(id: string, note: string) {
  const activities = getActivities().map((a) =>
    a.id === id ? { ...a, note } : a
  );
  saveActivities(activities);

  supabase
    .from("saved_items")
    .update({ note })
    .eq("id", id)
    .eq("user_id", getUserId())
    .then(({ error }) => {
      if (error) console.warn("[activityStore] update note failed", error);
    });
}

export function removeActivity(id: string) {
  const activities = getActivities().filter((a) => a.id !== id);
  saveActivities(activities);

  supabase
    .from("saved_items")
    .delete()
    .eq("id", id)
    .eq("user_id", getUserId())
    .then(({ error }) => {
      if (error) console.warn("[activityStore] delete failed", error);
    });
}

export function isArtworkSaved(artworkId: string): boolean {
  return getActivities().some((a) => a.artworkId === artworkId && a.action === "saved");
}

export function onActivityChange(callback: () => void): () => void {
  const handler = () => callback();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
