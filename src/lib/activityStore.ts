export interface ActivityEntry {
  id: string;
  artworkId: number;
  artworkTitle: string;
  artworkArtist: string;
  artworkImage: string;
  action: "saved" | "sent";
  timestamp: number;
  recipientHint?: string;
}

const STORAGE_KEY = "curate-activity";
const EVENT_NAME = "activity-update";

export function addActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
  const activities = getActivities();
  const newEntry: ActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  activities.unshift(newEntry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getActivities(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isArtworkSaved(artworkId: number): boolean {
  return getActivities().some((a) => a.artworkId === artworkId && a.action === "saved");
}

export function onActivityChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) callback();
  });
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}
