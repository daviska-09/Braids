import { useState, useEffect, useCallback, useRef } from "react";
import { fetchArtwork, interleave, type Artwork, type TaggedId } from "@/lib/artwork";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";

const LACE_TERMS = [
  "lace", "crochet", "needlepoint lace", "bobbin lace", "needle lace",
  "tatting", "lacework", "punto in aria", "reticella", "torchon",
  "chantilly", "valenciennes", "bruges", "irish crochet",
];

function matchesLace(art: Artwork): boolean {
  const fields = [art.classification, art.medium].map((f) => (f || "").toLowerCase());
  return LACE_TERMS.some((term) => fields.some((f) => f.includes(term)));
}

const BATCH_SIZE = 11;
const SESSION_LACE_IDS_KEY = "met_lace_ids_v2";
const SESSION_AIC_LACE_IDS_KEY = "aic_lace_ids_v2";

async function fetchMixedLaceIds(): Promise<TaggedId[]> {
  const [metIds, aicIds] = await Promise.all([
    // Met lace IDs (cached in sessionStorage)
    (async (): Promise<TaggedId[]> => {
      const stored = sessionStorage.getItem(SESSION_LACE_IDS_KEY);
      if (stored) {
        const ids: number[] = JSON.parse(stored);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        return ids.map((id): TaggedId => ({ id, museum: "met" }));
      }
      const res = await fetch("/lace-ids.json");
      const ids: number[] = await res.json();
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      sessionStorage.setItem(SESSION_LACE_IDS_KEY, JSON.stringify(ids));
      return ids.map((id): TaggedId => ({ id, museum: "met" }));
    })(),
    // AIC lace IDs (cached in sessionStorage)
    (async (): Promise<TaggedId[]> => {
      const stored = sessionStorage.getItem(SESSION_AIC_LACE_IDS_KEY);
      if (stored) {
        const ids: number[] = JSON.parse(stored);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        return ids.map((id): TaggedId => ({ id, museum: "aic" }));
      }
      const res = await fetch("/aic-lace-ids.json").catch(() => null);
      if (!res?.ok) return [];
      const ids: number[] = await res.json();
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      sessionStorage.setItem(SESSION_AIC_LACE_IDS_KEY, JSON.stringify(ids));
      return ids.map((id): TaggedId => ({ id, museum: "aic" }));
    })(),
  ]);

  return interleave(metIds, aicIds);
}

const LaceArchive = () => {
  const [allIds, setAllIds] = useState<TaggedId[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingSkeletons, setPendingSkeletons] = useState(BATCH_SIZE);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchMixedLaceIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0);
    });
    return () => { abortRef.current?.abort(); };
  }, []);

  const loadBatch = async (ids: TaggedId[], start: number) => {
    if (start >= ids.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    const slice = ids.slice(start, start + BATCH_SIZE * 2);
    setPendingSkeletons(BATCH_SIZE);
    await Promise.all(
      slice.map((item) =>
        fetchArtwork(item, 2, controller.signal).then((artwork) => {
          if (artwork && !controller.signal.aborted && matchesLace(artwork)) {
            setArtworks((prev) => [...prev, artwork]);
            setPendingSkeletons((prev) => Math.max(0, prev - 1));
          }
        })
      )
    );
    if (!controller.signal.aborted) {
      setCursor(start + slice.length);
      setLoading(false);
      setPendingSkeletons(0);
      loadingRef.current = false;
    }
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || cursor >= allIds.length) return;
    loadBatch(allIds, cursor);
  }, [allIds, cursor]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="px-6 md:px-10 pb-20">
      <div className="mt-2 mb-10 max-w-xl">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">lace archive</h1>
        <p className="font-serif text-lg md:text-xl text-foreground/80">
          a dedicated archive of lace and crochet from across human history. from needle lace to
          irish crochet, these are the most delicate threads in the collection.
        </p>
      </div>

      {artworks.length === 0 && pendingSkeletons === 0 && !loading ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">no lace pieces found in this region of the archive. keep scrolling.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {artworks.map((art, i) => (
            <ArtworkCard
              key={`${art.museum}-${art.id}`}
              artwork={art}
              index={i % BATCH_SIZE}
              onClick={() => setSelectedArtwork(art)}
            />
          ))}
          {pendingSkeletons > 0 &&
            Array.from({ length: pendingSkeletons }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="mb-4 break-inside-avoid bg-muted animate-pulse rounded"
                style={{ height: `${180 + (i * 53 % 180)}px` }}
              />
            ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  );
};

export default LaceArchive;
