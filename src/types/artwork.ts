// ─── Canonical artwork schema ──────────────────────────────────────────────
// All three APIs (Met, AIC, Europeana) are normalised into this single type.
// Components and stores must only consume ArtworkObject — never raw API shapes.

export const CACHE_VERSION = 1;

export interface ArtworkObject {
  id: string;
  source: "met" | "aic" | "europeana" | "va";
  title: string;
  artist: string;
  artistBio: string;
  date: string;
  culture: string;
  country: string;
  region: string;
  artistNationality: string;
  medium: string;
  dimensions: string;
  classification: string;
  department: string;
  credit: string;
  imageSmall: string;
  imageFull: string;
  objectUrl: string;
  museum: string;
  tags: string[];
}

// ─── Raw API shapes ──────────────────────────────────────────────────────────

export interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  objectDate: string;
  medium: string;
  department: string;
  culture: string;
  country: string;
  city: string;
  primaryImageSmall: string;
  primaryImage: string;
  objectURL: string;
  dimensions: string;
  creditLine: string;
  repository: string;
  classification: string;
  period: string;
  dynasty: string;
  reign: string;
  artistGender: string;
  artistNationality: string;
  geographyType: string;
  locale: string;
  locus: string;
  excavation: string;
  river: string;
  region: string;
  subregion: string;
  county: string;
  state: string;
  tags: { term: string; AAT_URL: string; Wikidata_URL: string }[] | null;
}

export interface ArticObject {
  id: number;
  title: string;
  artist_title: string | null;
  date_display: string | null;
  place_of_origin: string | null;
  medium_display: string | null;
  dimensions: string | null;
  artwork_type_title: string | null;
  department_title: string | null;
  credit_line: string | null;
  image_id: string | null;
}

export type EuropeanaItem = Record<string, unknown>;

export interface VARecord {
  systemNumber: string;
  _primaryTitle: string;
  _primaryMaker?: { name: string; association?: string };
  _primaryDate?: string;
  _primaryImageId?: string;
  _images?: {
    _primary_thumbnail?: string;
    _iiif_image_base_url?: string;
  };
  _primaryPlace?: string;
  objectType?: string;
  briefDescription?: string;
  materials?: string[];
  techniques?: string[];
}

// ─── Adapter functions ───────────────────────────────────────────────────────
// Each returns ArtworkObject | null. null means "no usable image or title".

export function adaptMetObject(obj: MetObject): ArtworkObject | null {
  if (!obj.primaryImageSmall || !obj.primaryImage || !obj.title) return null;
  return {
    id: String(obj.objectID),
    source: "met",
    title: obj.title,
    artist: obj.artistDisplayName || "",
    artistBio: obj.artistDisplayBio || "",
    date: obj.objectDate || "",
    culture: obj.culture || "",
    country: obj.country || "",
    region: obj.region || "",
    artistNationality: obj.artistNationality || "",
    medium: obj.medium || "",
    dimensions: obj.dimensions || "",
    classification: obj.classification || "",
    department: obj.department || "",
    credit: obj.creditLine || "",
    imageSmall: obj.primaryImageSmall,
    imageFull: obj.primaryImage,
    objectUrl: obj.objectURL,
    museum: "The Metropolitan Museum of Art",
    tags: obj.tags ? obj.tags.map((t) => t.term) : [],
  };
}

export function adaptAICObject(obj: ArticObject): ArtworkObject | null {
  if (!obj.image_id || !obj.title) return null;
  return {
    id: String(obj.id),
    source: "aic",
    title: obj.title,
    artist: obj.artist_title || "",
    artistBio: "",
    date: obj.date_display || "",
    culture: obj.place_of_origin || "",
    country: "",
    region: "",
    artistNationality: "",
    medium: obj.medium_display || "",
    dimensions: obj.dimensions || "",
    classification: obj.artwork_type_title || "",
    department: obj.department_title || "",
    credit: obj.credit_line || "",
    imageSmall: `https://www.artic.edu/iiif/2/${obj.image_id}/full/843,/0/default.jpg`,
    imageFull: `https://www.artic.edu/iiif/2/${obj.image_id}/full/1686,/0/default.jpg`,
    objectUrl: `https://www.artic.edu/artworks/${obj.id}`,
    museum: "Art Institute of Chicago",
    tags: [],
  };
}

export function adaptVARecord(rec: VARecord): ArtworkObject | null {
  if (!rec._primaryImageId || !rec._primaryTitle) return null;
  const imageId = rec._primaryImageId;
  const imageSmall = `https://framemark.vam.ac.uk/collections/${imageId}/full/!400,400/0/default.jpg`;
  const imageFull = `https://framemark.vam.ac.uk/collections/${imageId}/full/!1200,1200/0/default.jpg`;
  const materialTags = [
    ...(rec.materials ?? []),
    ...(rec.techniques ?? []),
  ];
  return {
    id: rec.systemNumber,
    source: "va",
    title: rec._primaryTitle,
    artist: rec._primaryMaker?.name ?? "",
    artistBio: "",
    date: rec._primaryDate ?? "",
    culture: rec._primaryPlace ?? "",
    country: rec._primaryPlace ?? "",
    region: "",
    artistNationality: "",
    medium: materialTags.join(", "),
    dimensions: "",
    classification: rec.objectType ?? "",
    department: "",
    credit: "",
    imageSmall,
    imageFull,
    objectUrl: `https://collections.vam.ac.uk/item/${rec.systemNumber}/`,
    museum: "Victoria and Albert Museum",
    tags: materialTags,
  };
}

export function adaptEuropeanaItem(item: EuropeanaItem): ArtworkObject | null {
  const imageSmall = (item.edmPreview as string[] | undefined)?.[0] ?? "";
  const title = (item.title as string[] | undefined)?.[0] ?? "";
  const shownBy = (item.edmIsShownBy as string[] | undefined)?.[0] ?? "";
  if (!imageSmall || !title || !shownBy) return null;
  return {
    id: String(item.id ?? ""),
    source: "europeana",
    title,
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
    tags: [],
  };
}
