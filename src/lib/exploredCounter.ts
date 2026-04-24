import { supabase } from "./supabase";

export const EXPLORED_KEY = "reel_explored";

// Module-level dedup set — persists across route changes within the session
// so the same artwork never increments the counter twice even if seen in both
// Gallery and LaceArchive.
const seenIds = new Set<string>();

/**
 * Records that an artwork has been explored.
 * - Deduplicates within the session (seenIds)
 * - Increments the local localStorage counter (per-device)
 * - Fires a background increment to Supabase (global, fire-and-forget)
 */
export function recordExplored(id: string): void {
  if (seenIds.has(id)) return;
  seenIds.add(id);

  const current = Number(localStorage.getItem(EXPLORED_KEY) ?? "0");
  localStorage.setItem(EXPLORED_KEY, String(current + 1));

  supabase.rpc("increment_explored").catch(() => { /* network failure — ignore */ });
}

/**
 * Returns the global explored count from Supabase.
 * Falls back to 0 on any error.
 */
export async function getGlobalExploredCount(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("explored_counter")
      .select("count")
      .single();
    if (error) return 0;
    return (data?.count as number) ?? 0;
  } catch {
    return 0;
  }
}
