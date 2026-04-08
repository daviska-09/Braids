

## Plan: "Curate Together" Tab with Save/Send Actions and Activity Feed

### Overview
Build the "curate together" page at `/curate`. When viewing any artwork (in the modal), users get two sharing actions: **copy link** and **send as postcard** (email). The Curate Together page displays a live feed of all saves and sends, creating a communal curation log.

All data is stored in-memory (localStorage) since there's no backend — this keeps it simple and functional without requiring Supabase.

### Changes

**1. Add sharing actions to ArtworkModal**
File: `src/components/ArtworkModal.tsx`

- Add two buttons below the artwork details:
  - **Copy Link** — copies a shareable URL (e.g. `/?artwork=objectID`) to clipboard, shows a toast confirmation
  - **Send as Postcard** — opens a small inline form with an email field; on submit, generates a `mailto:` link with a pre-filled subject/body containing the artwork title, image, and link. Shows toast confirmation.
- Both actions log an activity entry to localStorage with: artwork metadata (title, artist, image, objectID), action type ("saved" or "sent"), and timestamp

**2. Create shared activity store**
File: `src/lib/activityStore.ts`

- Simple localStorage-backed store with helpers:
  - `addActivity(entry)` — prepends a new activity
  - `getActivities()` — returns all activities, newest first
  - `onActivityChange(callback)` — uses `storage` event + custom event for cross-tab and same-tab reactivity
- Activity entry type: `{ id, artworkId, artworkTitle, artworkArtist, artworkImage, action: 'saved' | 'sent', timestamp, recipientHint? }`

**3. Create Curate Together page**
File: `src/pages/CurateTogether.tsx`

- Displays an activity feed of all saves and sends
- Each feed item shows: artwork thumbnail, title, action description ("saved to collection" or "sent as postcard"), and relative timestamp
- Clicking a feed item opens the artwork in the collection view
- Empty state: gentle message encouraging users to explore and share works
- Auto-refreshes when new activity is logged (via the store's event listener)

**4. Wire up routing and navigation**
Files: `src/App.tsx`, `src/components/Header.tsx`

- Add route `/curate` pointing to `CurateTogether`
- Make the "curate together" text in the header a clickable NavLink instead of a static span
- Keep the green dot indicator

### Technical Details

- **No backend needed** — localStorage keeps this lightweight and instant. Activities persist per browser.
- **Shareable artwork URL**: `/?artwork=12345` query param. Gallery page reads this on mount and auto-opens the modal for that artwork ID (fetches it via `fetchObject`).
- **Mailto for postcards**: Uses `mailto:` with URL-encoded subject/body containing artwork details and a link back to the app. No email API required.
- **Activity feed reactivity**: Uses `window.dispatchEvent(new Event('activity-update'))` after writes so the feed updates immediately without polling.
- **Toast notifications**: Uses existing sonner toaster for "Link copied" and "Postcard ready" confirmations.

### Visual Style
- Feed items use the same muted, editorial aesthetic as the rest of the app
- Small artwork thumbnails (48x48) with serif title text
- Relative timestamps ("2 min ago", "just now")
- Subtle entry animations using framer-motion

