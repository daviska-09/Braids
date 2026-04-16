import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://api.artic.edu/api/v1";
const LIMIT = 100;

// ── Generic paginated search (GET, broad textile query) ────────────────────
async function fetchTextilePage(page) {
  const url = `${BASE}/artworks/search?q=textile&fields=id,image_id&limit=${LIMIT}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) return { ids: [], totalPages: 0 };
  const json = await res.json();
  return {
    ids: (json.data || []).filter(d => d.image_id).map(d => d.id),
    totalPages: json.pagination?.total_pages ?? 0,
  };
}

async function collectTextileIds(maxPages = 30) {
  const set = new Set();
  const { ids, totalPages } = await fetchTextilePage(1);
  ids.forEach(id => set.add(id));
  const pages = Math.min(totalPages, maxPages);
  for (let page = 2; page <= pages; page++) {
    const { ids } = await fetchTextilePage(page);
    ids.forEach(id => set.add(id));
    await new Promise(r => setTimeout(r, 80));
  }
  return [...set];
}

// ── Field-specific POST search (targets medium_display / artwork_type_title) ─
async function fetchLacePage(terms, page) {
  const shouldClauses = terms.flatMap(term => [
    { match: { medium_display: term } },
    { match: { artwork_type_title: term } },
  ]);

  const body = JSON.stringify({
    query: {
      bool: {
        must: [{ exists: { field: "image_id" } }],
        should: shouldClauses,
        minimum_should_match: 1,
      },
    },
    fields: ["id", "image_id"],
    limit: LIMIT,
    page,
  });

  const res = await fetch(`${BASE}/artworks/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) return { ids: [], totalPages: 0 };
  const json = await res.json();
  return {
    ids: (json.data || []).filter(d => d.image_id).map(d => d.id),
    totalPages: json.pagination?.total_pages ?? 0,
  };
}

const LACE_TERMS = [
  "lace", "crochet", "tatting", "lacework",
  "punto in aria", "reticella", "torchon", "chantilly",
  "valenciennes", "bruges", "needle lace", "bobbin lace",
];

async function collectLaceIds(maxPages = 50) {
  const set = new Set();
  const { ids, totalPages } = await fetchLacePage(LACE_TERMS, 1);
  ids.forEach(id => set.add(id));
  const pages = Math.min(totalPages, maxPages);
  for (let page = 2; page <= pages; page++) {
    const { ids } = await fetchLacePage(LACE_TERMS, page);
    ids.forEach(id => set.add(id));
    await new Promise(r => setTimeout(r, 80));
  }
  return [...set];
}

// ── Run ────────────────────────────────────────────────────────────────────
console.log("Fetching AIC textile IDs...");
const textileIds = await collectTextileIds(30);
writeFileSync(
  path.join(__dirname, 'public', 'aic-textile-ids.json'),
  JSON.stringify(textileIds),
  'utf8'
);
console.log(`${textileIds.length} AIC textile IDs → public/aic-textile-ids.json`);

console.log("Fetching AIC lace IDs (field-specific query)...");
const laceIds = await collectLaceIds(50);
writeFileSync(
  path.join(__dirname, 'public', 'aic-lace-ids.json'),
  JSON.stringify(laceIds),
  'utf8'
);
console.log(`${laceIds.length} AIC lace IDs → public/aic-lace-ids.json`);
