

## Plan

### 1. Filled bookmark when already saved
**File: `src/lib/activityStore.ts`**
- Add `isArtworkSaved(artworkId: number): boolean` helper that checks if any activity with that ID and action `"saved"` exists.

**File: `src/components/ArtworkModal.tsx`**
- Import `getActivities` and `isArtworkSaved` from the store.
- Track `isSaved` state, initialized from `isArtworkSaved(artwork.objectID)`. Set to `true` after `handleSave`.
- Render `<Bookmark>` with `fill="currentColor"` when saved, unfilled otherwise. Update label to "saved" when already saved.

### 2. Remove green dot from curate together nav link
**File: `src/components/Header.tsx`**
- Remove the `<span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />` element on line 40 inside the "curate together" NavLink.

