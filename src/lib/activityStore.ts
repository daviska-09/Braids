export interface ActivityEntry {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkArtist: string;
  artworkImage: string;
  action: "saved" | "sent";
  timestamp: number;
  recipientHint?: string;
}

const STORAGE_KEY = "curate-activity";
const EVENT_NAME = "activity-update";
const MAX_ACTIVITIES = 100;

export function addActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
  const activities = getActivities();
  const newEntry: ActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  activities.unshift(newEntry);
  if (activities.length > MAX_ACTIVITIES) activities.length = MAX_ACTIVITIES;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch {
    // localStorage quota exceeded — activity won't persist this session
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getActivities(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function removeActivity(id: string) {
  const activities = getActivities().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  window.dispatchEvent(new Event(EVENT_NAME));
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
