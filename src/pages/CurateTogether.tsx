import { useState, useEffect } from "react";
import { useT } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { getActivities, onActivityChange, removeActivity, updateNote, updateArtworkImage, hydrateFromSupabase, type ActivityEntry } from "@/lib/activityStore";
import type { Artwork } from "@/lib/artwork";
import ArtworkModal from "@/components/ArtworkModal";
import { Link2, Mail, X } from "lucide-react";
import { getMetObject } from "@/services/metService";
import { getAICObject } from "@/services/aicService";

const EUROPEANA_KEY = import.meta.env.VITE_EUROPEANA_API_KEY as string;

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toArtwork(a: ActivityEntry): Artwork {
  return {
    id: a.artworkId,
    title: a.artworkTitle,
    artist: a.artworkArtist,
    artistBio: a.artworkArtistBio ?? "",
    date: a.artworkDate ?? "",
    culture: a.artworkCulture ?? "",
    country: a.artworkCountry ?? "",
    region: a.artworkRegion ?? "",
    artistNationality: "",
    medium: a.artworkMedium ?? "",
    dimensions: a.artworkDimensions ?? "",
    classification: a.artworkClassification ?? "",
    department: a.artworkDepartment ?? "",
    credit: a.artworkCredit ?? "",
    imageSmall: a.artworkImage,
    imageFull: a.artworkImage,
    objectUrl: a.artworkObjectUrl ?? "",
    museum: a.artworkMuseum ?? "",
    source: a.artworkSource,
    tags: [],
  };
}

async function refreshImageUrl(entry: ActivityEntry): Promise<string | null> {
  try {
    if (entry.artworkMuseum === "The Metropolitan Museum of Art") {
      const artwork = await getMetObject(parseInt(entry.artworkId));
      return artwork?.imageSmall ?? null;
    }
    if (entry.artworkMuseum === "Art Institute of Chicago") {
      const artwork = await getAICObject(parseInt(entry.artworkId));
      return artwork?.imageSmall ?? null;
    }
    if (entry.artworkSource === "europeana") {
      const res = await fetch(
        `https://api.europeana.eu/record/v2${entry.artworkId}.json?wskey=${EUROPEANA_KEY}`
      );
      if (!res.ok) return null;
      const data = await res.json() as { object?: { europeanaAggregation?: { edmPreview?: string }; aggregations?: { edmIsShownBy?: string }[] } };
      return (
        data?.object?.europeanaAggregation?.edmPreview ??
        data?.object?.aggregations?.[0]?.edmIsShownBy ??
        null
      );
    }
  } catch {
    return null;
  }
  return null;
}

// ─── Per-card component so each manages its own image state ──────────────────

interface SavedCardProps {
  entry: ActivityEntry;
  onOpen: () => void;
  onRemove: () => void;
}

const SavedCard = ({ entry, onOpen, onRemove }: SavedCardProps) => {
  const [imgSrc, setImgSrc] = useState(entry.artworkImage);
  const [imgVisible, setImgVisible] = useState(true);

  const handleImageError = async () => {
    const fresh = await refreshImageUrl(entry);
    if (fresh) {
      setImgSrc(fresh);
      updateArtworkImage(entry.id, fresh);
    } else {
      setImgVisible(false);
    }
  };

  return (
    <div
      onClick={onOpen}
      className="bg-card border border-border rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative"
    >
      {imgSrc && imgVisible && (
        <img
          src={imgSrc}
          alt={entry.artworkTitle}
          className="w-full block"
          onError={handleImageError}
        />
      )}
      <div className="p-3">
        <p className="font-serif text-sm text-foreground leading-snug">
          {entry.artworkTitle}
        </p>
        {entry.artworkArtist && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.artworkArtist}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
          {entry.action === "saved" ? (
            <><Link2 className="w-3 h-3 flex-shrink-0" /> saved to collection</>
          ) : (
            <><Mail className="w-3 h-3 flex-shrink-0" /> sent as dispatch{entry.recipientHint ? ` to ${entry.recipientHint}` : ""}</>
          )}
        </p>
        <p className="text-xs text-foreground/30 mt-1">{timeAgo(entry.timestamp)}</p>
        <textarea
          defaultValue={entry.note ?? ""}
          placeholder="Add a note..."
          rows={1}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const val = e.currentTarget.value.trim();
            if (val !== (entry.note ?? "").trim()) updateNote(entry.id, val);
          }}
          className="mt-2 w-full resize-none bg-transparent text-xs text-foreground/70 placeholder:text-foreground/25 outline-none border-none focus:ring-0 leading-relaxed"
        />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/80 rounded-full text-muted-foreground hover:text-foreground"
        aria-label="Remove from feed"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CurateTogether = () => {
  const t = useT();
  const [activities, setActivities] = useState<ActivityEntry[]>(getActivities);
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);

  useEffect(() => { document.title = "Saved | Reel Museum"; return () => { document.title = "Reel Museum"; }; }, []);

  useEffect(() => {
    hydrateFromSupabase().then(setActivities);
    const unsub = onActivityChange(() => setActivities(getActivities()));
    return unsub;
  }, []);

  return (
    <div className="px-6 md:px-10 pb-20">
      <p className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl">
        {t.saved.subtitle}
      </p>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">{t.saved.empty}</p>
          <p className="text-xs mt-2">{t.saved.emptyHint}</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 min-[1200px]:columns-4 [column-gap:12px]">
          <AnimatePresence initial={false}>
            {activities.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="break-inside-avoid mb-3"
              >
                <SavedCard
                  entry={a}
                  onOpen={() => setSelectedEntry(a)}
                  onRemove={() => removeActivity(a.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ArtworkModal
        artwork={selectedEntry ? toArtwork(selectedEntry) : null}
        onClose={() => setSelectedEntry(null)}
        note={selectedEntry?.note}
        onNoteChange={(val) => { if (selectedEntry) updateNote(selectedEntry.id, val); }}
      />
    </div>
  );
};

export default CurateTogether;
