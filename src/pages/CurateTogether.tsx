import { useState, useEffect } from "react";
import { useT } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { getActivities, onActivityChange, removeActivity, updateNote, hydrateFromSupabase, type ActivityEntry } from "@/lib/activityStore";
import type { Artwork } from "@/lib/artwork";
import ArtworkModal from "@/components/ArtworkModal";
import { Link2, Mail, X } from "lucide-react";

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
  };
}

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
      {/* CHANGE 1: copy update */}
      <p className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl">
        {t.saved.subtitle}
      </p>

      {activities.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">{t.saved.empty}</p>
          <p className="text-xs mt-2">{t.saved.emptyHint}</p>
        </div>
      ) : (
        /* CHANGE 2: masonry grid via CSS columns */
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
                {/* CHANGE 3: open modal instead of navigating away */}
                <div
                  onClick={() => setSelectedEntry(a)}
                  className="bg-card border border-border rounded overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative"
                >
                  {a.artworkImage && (
                    <img
                      src={a.artworkImage}
                      alt={a.artworkTitle}
                      className="w-full block"
                    />
                  )}
                  <div className="p-3">
                    <p className="font-serif text-sm text-foreground leading-snug">
                      {a.artworkTitle}
                    </p>
                    {a.artworkArtist && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.artworkArtist}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                      {a.action === "saved" ? (
                        <><Link2 className="w-3 h-3 flex-shrink-0" /> saved to collection</>
                      ) : (
                        <><Mail className="w-3 h-3 flex-shrink-0" /> sent as dispatch{a.recipientHint ? ` to ${a.recipientHint}` : ""}</>
                      )}
                    </p>
                    <p className="text-xs text-foreground/30 mt-1">{timeAgo(a.timestamp)}</p>
                    <textarea
                      defaultValue={a.note ?? ""}
                      placeholder="Add a note..."
                      rows={1}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const val = e.currentTarget.value.trim();
                        if (val !== (a.note ?? "").trim()) updateNote(a.id, val);
                      }}
                      className="mt-2 w-full resize-none bg-transparent text-xs text-foreground/70 placeholder:text-foreground/25 outline-none border-none focus:ring-0 leading-relaxed"
                    />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeActivity(a.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background/80 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Remove from feed"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
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
