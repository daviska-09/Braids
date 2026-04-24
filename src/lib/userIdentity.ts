const USER_ID_KEY = "reel_user_id";

/**
 * Returns the persistent anonymous user ID for this device.
 * Generated once, stored in localStorage, never changes unless
 * localStorage is wiped (in which case a new one is created and
 * Supabase data is re-fetched using the new ID — effectively a new user).
 */
export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}
