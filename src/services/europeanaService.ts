import type { Artwork } from "@/lib/artwork";

const BASE = "https://api.europeana.eu/record/v2/search.json";
const API_KEY = import.meta.env.VITE_EUROPEANA_API_KEY as string;

const COLLECTION_QUERY =
  "(textile OR weaving OR tapestry OR embroidery OR costume OR fabric OR silk OR wool OR carpet OR brocade) AND NOT (lace OR crochet)";

const LACE_QUERY =
  'lace OR crochet OR needlework OR "bobbin lace" OR "needle lace" OR tatting OR lacework OR "Irish crochet"';

// When irishOnly — lead with explicit Irish lace terms so relevance is higher,
// then fall back to general lace terms filtered by COUNTRY:ireland
const IRISH_LACE_QUERY =
  '"irish lace" OR "irish crochet" OR "Carrickmacross" OR "Limerick lace" OR "Kenmare lace" OR lace OR crochet OR tatting OR lacework';

function mapToArtwork(item: Record<string, unknown>): Artwork | null {
  const imageSmall = (item.edmPreview as string[] | undefined)?.[0] ?? "";
  if (!imageSmall) return null;
  return {
    id: String(item.id ?? ""),
    title: (item.title as string[] | undefined)?.[0] ?? "",
    artist: (item.dcCreator as string[] | undefined)?.[0] ?? "",
    artistBio: "",
    date: (item.year as string[] | undefined)?.[0] ?? "",
    culture: (item.country as string[] | undefined)?.[0] ?? "",
    country: (item.country as string[] | undefined)?.[0] ?? "",
    region: "",
    artistNationality: "",
    medium: (item.dcFormat as string[] | undefined)?.[0] ?? "",
    dimensions: "",
    classification: "",
    department: "",
    credit: "",
    imageSmall,
    imageFull: imageSmall,
    objectUrl: String(item.guid ?? ""),
    museum: (item.dataProvider as string[] | undefined)?.[0] ?? "Europeana",
    source: "europeana",
  };
}

function ssGetItem(id: string): Artwork | null {
  try {
    const s = sessionStorage.getItem("europeana:" + id);
    return s ? (JSON.parse(s) as Artwork) : null;
  } catch { return null; }
}

function ssSaveItem(artwork: Artwork) {
  try { sessionStorage.setItem("europeana:" + artwork.id, JSON.stringify(artwork)); } catch { /* quota */ }
}

function ssGetPage(pageKey: string): Artwork[] | null {
  try {
    const raw = sessionStorage.getItem(pageKey);
    if (!raw) return null;
    const ids: string[] = JSON.parse(raw);
    const items = ids.map(ssGetItem).filter((a): a is Artwork => a !== null);
    return items.length === ids.length ? items : null;
  } catch { return null; }
}

function ssSavePage(pageKey: string, artworks: Artwork[]) {
  for (const a of artworks) ssSaveItem(a);
  try { sessionStorage.setItem(pageKey, JSON.stringify(artworks.map((a) => a.id))); } catch { /* quota */ }
}

async function fetchEuropeana(query: string, page: number, irishOnly = false, cacheKey = "europeana:collection"): Promise<Artwork[]> {
  const pageKey = `${cacheKey}:p${page}`;
  const cached = ssGetPage(pageKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    wskey: API_KEY,
    query,
    rows: "9",
    start: String((page - 1) * 9 + 1),
    profile: "rich",
  });
  params.append("qf", "TYPE:IMAGE");
  params.append("reusability", "open");
  params.append("reusability", "permission");
  if (irishOnly) params.append("qf", "COUNTRY:ireland");

  try {
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    const artworks = ((json.items ?? []) as Record<string, unknown>[])
      .map(mapToArtwork)
      .filter((x): x is Artwork => x !== null);
    ssSavePage(pageKey, artworks);
    return artworks;
  } catch {
    return [];
  }
}

export function fetchEuropeanaCollection(page: number): Promise<Artwork[]> {
  return fetchEuropeana(COLLECTION_QUERY, page, false, "europeana:collection");
}

export function fetchEuropeanaLace(page: number, irishOnly: boolean): Promise<Artwork[]> {
  return fetchEuropeana(
    irishOnly ? IRISH_LACE_QUERY : LACE_QUERY,
    page,
    irishOnly,
    irishOnly ? "europeana:irishlace" : "europeana:lace"
  );
}
