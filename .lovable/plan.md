

## Plan: Clickable Globe Threads — Navigate to Filtered Collection

### Overview
Make the thread arcs on the globe clickable. Clicking a thread navigates to the collection page (`/`) filtered by the two geographic origins that thread connects.

### Changes

**1. Update Globe component to support click interaction**
File: `src/components/Globe.tsx`

- Store metadata (city/region names) alongside each point, not just lat/lng coordinates
- Add Three.js `Raycaster` to detect clicks on thread line geometries
- On click, identify which thread was hit, determine the two connected origin labels, and call a new `onThreadClick` callback prop
- Add a visual hover state: change cursor to pointer and subtly highlight the hovered thread (increase opacity or change color)

**2. Pass origin labels from Uncovered page**
File: `src/pages/Uncovered.tsx`

- Extend `SAMPLE_POINTS` to include a `label` field (e.g., `{ lat: 35.68, lng: 139.69, label: "Tokyo" }`)
- Update `generateDensePoints` to carry labels from their reference point
- Pass an `onThreadClick` handler to `<Globe>` that calls `navigate('/?origins=Tokyo,Delhi')` using React Router

**3. Support origin filter on the Gallery/Collection page**
File: `src/pages/Gallery.tsx`

- Read `origins` query parameter from the URL
- When present, display a filter banner showing the active origin filter with a clear button
- Filter displayed artworks by matching the `artistNationality`, `country`, or `culture` fields from Met API data against the origin labels
- When filter is cleared, remove query param and show all artworks

### Technical Details

- **Raycasting on lines**: Three.js `Raycaster` has limited line intersection support. We'll increase each thread's raycast threshold (~0.05) and use `raycaster.intersectObjects(threadLines)` on click events
- **Hover effect**: On `mousemove`, run raycaster and toggle thread material opacity (0.15 → 0.5) plus set `cursor: pointer` on the canvas
- **Props change**: `GlobeProps` becomes `{ points: { lat, lng, label }[]; onThreadClick?: (originA: string, originB: string) => void }`
- **URL-based filtering**: Uses `useSearchParams` from React Router so filtered views are shareable

### Visual Result
- Threads glow subtly on hover with a pointer cursor
- Clicking navigates to collection page showing artworks from both connected origins
- A small banner at the top of the collection shows active filter with dismiss option

