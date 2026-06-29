import { type ArtworkObject } from "@/types/artwork";
import type { Lang } from "@/contexts/LanguageContext";

const BASE_URL = (import.meta.env.VITE_LIBRETRANSLATE_URL as string | undefined)
  ?? "https://translate.argosopentech.com";

// Cache keyed by "text:targetLang" so each (text, language) pair is only fetched once
const cache = new Map<string, string>();

async function translateText(text: string, targetLang: Lang): Promise<string> {
  if (!text.trim()) return text;

  const key = `${text}:${targetLang}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: targetLang }),
    });

    if (!res.ok) return text;

    const { translatedText } = await res.json() as { translatedText: string };
    const result = translatedText || text;
    cache.set(key, result);
    return result;
  } catch {
    return text;
  }
}

/**
 * Translates the human-readable fields of an artwork into the target language.
 * - For "en": translates all sources (handles non-English Europeana data)
 * - For "fr"/"nl": translates all sources (Met/AIC are English, Europeana may not be)
 * - Met and AIC with target "en" are skipped — they're already in English.
 * Falls back to the original value silently if translation fails.
 */
export async function translateArtwork(artwork: ArtworkObject, targetLang: Lang): Promise<ArtworkObject> {
  // Met and AIC data is already in English — skip if target is also English
  if (targetLang === "en" && artwork.source !== "europeana") return artwork;

  const [title, medium] = await Promise.all([
    translateText(artwork.title, targetLang),
    translateText(artwork.medium, targetLang),
  ]);

  return { ...artwork, title, medium };
}
