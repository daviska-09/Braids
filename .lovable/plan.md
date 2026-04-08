

## Plan: Remove "people viewing" feature

### Changes

**File: `src/components/Header.tsx`**
- Remove the `useState` and `useEffect` for `viewers` (the random counter logic)
- Remove the `<div>` block that displays "{viewers} people viewing" with the green dot
- Remove the `useState`/`useEffect` imports if no longer needed

Single file, ~15 lines removed.

