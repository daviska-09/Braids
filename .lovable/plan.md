

## Plan: Filter Out Paintings/Drawings from the Feed

### Problem
The search queries (e.g. "silk", "costume") return broad results from the Met API, including paintings and drawings that happen to mention those terms. There's no filtering on the fetched objects.

### Solution
Add a filter in `fetchObject()` that rejects objects whose `department` or `classification` indicates a painting, drawing, or similar 2D fine art. This ensures only textiles, garments, and decorative arts appear.

### Changes

**File: `src/lib/metApi.ts`**
- Add an exclusion list of departments/classifications: `"Paintings"`, `"Drawings and Prints"`, `"Photographs"`, `"European Paintings"`, `"American Paintings and Sculpture"`
- In `fetchObject()`, after fetching and validating the image, check if `obj.department` or `obj.classification` matches any excluded term (case-insensitive). If so, return `null`.
- Also clear the cache of any previously cached items that would now be excluded (by clearing `cachedObjectIds` won't help since those are just IDs -- the object-level filter handles it).

```text
Excluded departments:
  - Paintings
  - Drawings and Prints
  - Photographs
  - European Paintings
  - American Paintings and Sculpture

Excluded classifications (partial match):
  - Painting
  - Drawing
  - Print
  - Photograph
```

This is a single-file change with ~10 lines added.

