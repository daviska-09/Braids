import { type ArtworkObject } from "@/types/artwork";

const BASE_URL = (import.meta.env.VITE_LIBRETRANSLATE_URL as string | undefined)
  ?? "https://translate.argosopentech.com";

// In-memory cache so the same string is never translated twice per session
const cache = new Map<string, string>();

async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;

  const cached = cache.get(text);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: "en" }),
    });

    if (!res.ok) return text;

    const { translatedText } = await res.json() as { translatedText: string };
    const result = translatedText || text;
    cache.set(text, result);
    return result;
  } catch {
    return text;
  }
}

/**
 * Translates the human-readable fields of an artwork to English.
 * Falls back to the original value silently if translation fails.
 * Only translates fields that are likely to contain natural language text.
 */
export async function translateArtwork(artwork: ArtworkObject): Promise<ArtworkObject> {
  const [title, medium] = await Promise.all([
    translateText(artwork.title),
    translateText(artwork.medium),
  ]);

  return { ...artwork, title, medium };
}
