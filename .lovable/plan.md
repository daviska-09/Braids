

## Plan: Add Thread Lines Connecting Dots on the Globe

### Concept
Draw curved lines (arcs) on the globe surface connecting nearby dots to each other, evoking the metaphor of threads linking textile origins across cultures and geographies. The threads will be semi-transparent, thin lines that arc slightly above the globe surface.

### Implementation — `src/components/Globe.tsx`

**Generate thread connections:** After computing dot positions, create a set of connections by linking each point to its 2-3 nearest neighbors (with a max distance threshold to avoid spanning the entire globe). Use a deterministic seed from point indices to keep it stable. Cap total threads at ~150 to maintain performance and visual clarity.

**Draw arcs as QuadraticBezierCurve3:** For each connection pair, compute a curved path that arcs slightly above the globe surface (lifting the midpoint to ~1.08 radius). Use `THREE.QuadraticBezierCurve3` to get smooth arc points, then render each as a `THREE.Line` with a thin, semi-transparent material (e.g., `color: 0x999999, opacity: 0.15`).

**Add to scene group:** Add all thread lines to the same rotating `THREE.Group` so they rotate with the globe and dots.

**No changes needed to `Uncovered.tsx`** — the points data stays the same; threads are purely a visual layer in the Globe component.

### Visual Result
- Thin, slightly curved arcs connecting nearby origin dots
- Low opacity so they don't overwhelm the dots
- Evokes woven threads spanning the globe — matching the "Braid" concept

