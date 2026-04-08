

## Plan: Add Blog Tab with localStorage

### Overview
Add a "journal" nav tab linking to `/journal`. The page mirrors the Gallery's visual style (masonry cards, serif subtitle). Posts are stored in localStorage. A simple admin toggle (hidden button or URL param) unlocks create/edit/delete.

### Changes

**1. `src/components/Header.tsx`**
- Add a NavLink to `/journal` labeled "journal" (same style as others).

**2. `src/App.tsx`**
- Import and add route for `/journal` → `Journal` page.

**3. `src/lib/blogStore.ts`** (new)
- Types: `BlogPost { id, title, body, imageUrl?, createdAt, updatedAt }`
- CRUD helpers using localStorage key `"blog_posts"`: `getPosts`, `addPost`, `updatePost`, `deletePost`
- Admin mode: `isAdmin()` / `toggleAdmin()` backed by localStorage flag.

**4. `src/pages/Journal.tsx`** (new)
- Subtitle: serif text like Gallery ("thoughts, threads, reflections.")
- Masonry-style grid of post cards (image + title + date + truncated body)
- Click card → expands into a modal or inline detail view
- When admin mode is on: floating "+" button to create post, edit/delete buttons on each card
- Create/edit form: title, body (textarea), optional image URL
- Admin toggle: triple-click the page subtitle to toggle admin mode (no visible UI for visitors)

### Technical Notes
- No auth needed — admin is a localStorage flag toggled by a hidden gesture
- Posts persist across sessions on the same browser
- Matches existing visual patterns: `px-6 md:px-10 pb-20`, `font-serif`, muted color tokens

