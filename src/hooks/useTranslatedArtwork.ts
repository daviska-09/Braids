import { useState, useEffect } from "react";
import type { Artwork } from "@/lib/artwork";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateArtwork } from "@/services/translationService";

/**
 * Returns a language-translated copy of the artwork.
 * Translation starts on mount and whenever the language changes.
 * Falls back to the original artwork while the request is in flight.
 */
export function useTranslatedArtwork(artwork: Artwork | null): Artwork | null {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState<Artwork | null>(artwork);

  useEffect(() => {
    if (!artwork) { setTranslated(null); return; }

    // Met and AIC are already in English — skip if target is also English
    if (lang === "en" && artwork.source !== "europeana") {
      setTranslated(artwork);
      return;
    }

    let cancelled = false;
    translateArtwork(artwork, lang).then((result) => {
      if (!cancelled) setTranslated(result);
    });

    return () => { cancelled = true; };
  }, [artwork?.id, lang]);

  // Return original immediately so there's no blank flash while translating
  return translated ?? artwork;
}
