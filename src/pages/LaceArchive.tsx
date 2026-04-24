import { useState, useEffect, useCallback, useRef } from "react";
import { fetchArtwork, interleave, type Artwork, type TaggedId } from "@/lib/artwork";
import { fetchEuropeanaLace } from "@/services/europeanaService";
import { isLacePiece } from "@/utils/textileFilters";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import Masonry from "react-masonry-css";
import { recordExplored } from "@/lib/exploredCounter";

const MASONRY_BREAKPOINTS = { default: 5, 1280: 5, 1024: 4, 768: 3, 0: 2 };
const BATCH_SIZE = 11;
const SESSION_LACE_IDS_KEY = "met_lace_ids_v2";
const SESSION_IRISH_LACE_IDS_KEY = "met_irish_lace_ids_v1";
const SESSION_AIC_LACE_IDS_KEY = "aic_lace_ids_v2";

function isIrishPiece(art: Artwork): boolean {
  const fields = [art.culture, art.country, art.artistNationality, art.region]
    .map((f) => (f || "").toLowerCase());
  return fields.some((f) => f.includes("ireland") || f.includes("irish"));
}

async function loadFromSession(sessionKey: string, jsonPath: string): Promise<number[]> {
  const stored = sessionStorage.getItem(sessionKey);
  if (stored) {
    const ids: number[] = JSON.parse(stored);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }
  const res = await fetch(jsonPath).catch(() => null);
  if (!res?.ok) return [];
  const ids: number[] = await res.json();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  sessionStorage.setItem(sessionKey, JSON.stringify(ids));
  return ids;
}

async function fetchMixedLaceIds(): Promise<TaggedId[]> {
  const [metIds, aicIds] = await Promise.all([
    loadFromSession(SESSION_LACE_IDS_KEY, "/lace-ids.json")
      .then((ids) => ids.map((id): TaggedId => ({ id, museum: "met" }))),
    loadFromSession(SESSION_AIC_LACE_IDS_KEY, "/aic-lace-ids.json")
      .then((ids) => ids.map((id): TaggedId => ({ id, museum: "aic" }))),
  ]);
  return interleave(metIds, aicIds);
}

async function fetchIrishMixedLaceIds(): Promise<TaggedId[]> {
  const [metIds, aicIds] = await Promise.all([
    // Pre-filtered Irish Met lace IDs — no runtime Irish check needed for these
    loadFromSession(SESSION_IRISH_LACE_IDS_KEY, "/irish-lace-ids.json")
      .then((ids) => ids.map((id): TaggedId => ({ id, museum: "met" }))),
    // AIC lace pool — filtered by isIrishPiece at runtime
    loadFromSession(SESSION_AIC_LACE_IDS_KEY, "/aic-lace-ids.json")
      .then((ids) => ids.map((id): TaggedId => ({ id, museum: "aic" }))),
  ]);
  return interleave(metIds, aicIds);
}

const LaceArchive = () => {
  const [irishOnly, setIrishOnly] = useState(false);
  const [allIds, setAllIds] = useState<TaggedId[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingSkeletons, setPendingSkeletons] = useState(BATCH_SIZE);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const euroPageRef = useRef(1);

  useEffect(() => {
    abortRef.current?.abort();
    setArtworks([]);
    setCursor(0);
    euroPageRef.current = 1;
    setLoading(true);
    loadingRef.current = false;
    setPendingSkeletons(BATCH_SIZE);

    const loadIds = irishOnly ? fetchIrishMixedLaceIds : fetchMixedLaceIds;
    loadIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0, 1, irishOnly);
    });

    return () => { abortRef.current?.abort(); };
  }, [irishOnly]);

  const loadBatch = async (
    ids: TaggedId[],
    start: number,
    euroPage: number,
    irish: boolean
  ) => {
    if (start >= ids.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    const slice = ids.slice(start, start + BATCH_SIZE * 2);
    setPendingSkeletons(BATCH_SIZE);

    const incoming: Artwork[] = [];

    await Promise.all([
      // Met items when irish=true are from irish-lace-ids.json — pre-filtered, always pass
      // AIC items when irish=true are filtered by isIrishPiece at runtime
      ...slice.map((item) =>
        fetchArtwork(item, 2, controller.signal).then((artwork) => {
          if (!artwork || controller.signal.aborted) return;
          const passes =
            isLacePiece(artwork) &&
            (!irish || item.museum === "met" || isIrishPiece(artwork));
          if (passes) incoming.push(artwork);
        })
      ),
      // Europeana — already scoped by COUNTRY:ireland + Irish lace query when irish=true
      fetchEuropeanaLace(euroPage, irish).then((items) => {
        if (controller.signal.aborted) return;
        incoming.push(...items.filter(isLacePiece));
      }),
    ]);

    if (!controller.signal.aborted) {
      setArtworks((prev) => [...prev, ...incoming]);
      setCursor(start + slice.length);
      euroPageRef.current = euroPage + 1;
      setLoading(false);
      setPendingSkeletons(0);
      loadingRef.current = false;
    }
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || cursor >= allIds.length) return;
    loadBatch(allIds, cursor, euroPageRef.current, irishOnly);
  }, [allIds, cursor, irishOnly]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "2000px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="px-6 md:px-10 pb-20">
      <div className="mt-2 mb-10 max-w-xl">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">lace archive</h1>
        <p className="font-serif text-lg md:text-xl text-foreground/80">
          a dedicated archive of lace and crochet from across human history. these are the most delicate threads in the collection.
        </p>
        <div className="flex items-center gap-6 mt-4 text-sm tracking-wide">
          <button
            onClick={() => setIrishOnly(false)}
            className={!irishOnly ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
          >
            all lace
          </button>
          <button
            onClick={() => setIrishOnly(true)}
            className={irishOnly ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
          >
            irish lace
          </button>
        </div>
      </div>

      {artworks.length === 0 && pendingSkeletons === 0 && !loading ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">no lace pieces found in this region of the archive. keep scrolling.</p>
        </div>
      ) : (
        <Masonry
          breakpointCols={MASONRY_BREAKPOINTS}
          className="masonry-grid"
          columnClassName="masonry-grid-col"
        >
          {artworks.map((art, i) => (
            <ArtworkCard
              key={`${art.museum}-${art.id}`}
              artwork={art}
              index={i % BATCH_SIZE}
              onClick={() => { setSelectedArtwork(art); recordExplored(`${art.museum}-${art.id}`); }}
            />
          ))}
          {pendingSkeletons > 0 &&
            Array.from({ length: pendingSkeletons }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="mb-4 bg-muted animate-pulse rounded"
                style={{ height: `${180 + (i * 53 % 180)}px` }}
              />
            ))}
        </Masonry>
      )}

      <div ref={sentinelRef} className="h-1" />

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  );
};

export default LaceArchive;
