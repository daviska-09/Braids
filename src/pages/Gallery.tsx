import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTextileObjectIds, fetchObject } from "@/lib/metApi";
import { fetchArtwork, fromMetObject, interleave, type Artwork, type TaggedId } from "@/lib/artwork";
import { fetchEuropeanaCollection, clearEuropeanaCollectionCache } from "@/services/europeanaService";
import { isCollectionPiece } from "@/utils/textileFilters";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import Masonry from "react-masonry-css";
import { X } from "lucide-react";
import { recordExplored } from "@/lib/exploredCounter";

const MASONRY_BREAKPOINTS = { default: 5, 1280: 5, 1024: 4, 768: 3, 0: 2 };

const BATCH_SIZE = 8;

function matchesOrigins(art: Artwork, origins: string[]): boolean {
  const fields = [art.artistNationality, art.country, art.culture, art.region]
    .map((f) => (f || "").toLowerCase());
  return origins.some((origin) => {
    const o = origin.toLowerCase();
    return fields.some((f) => f.includes(o));
  });
}

// Resolves with null after ms if the promise hasn't settled yet,
// so one slow/throttled fetch can't block the whole batch.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);
}

async function fetchMixedTextileIds(): Promise<TaggedId[]> {
  const [metIds, aicIds] = await Promise.all([
    fetchTextileObjectIds().then((ids) =>
      ids.map((id): TaggedId => ({ id, museum: "met" }))
    ),
    fetch("/aic-textile-ids.json")
      .then((r) => r.json())
      .then((ids: number[]) => {
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        return ids.map((id): TaggedId => ({ id, museum: "aic" }));
      })
      .catch(() => [] as TaggedId[]),
  ]);
  // Fully shuffle the combined list so batches don't pull consecutive items
  // from the same collection.
  const combined = interleave(metIds, aicIds);
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined;
}

const Gallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const originsParam = searchParams.get("origins");
  const origins = originsParam ? originsParam.split(",").map((s) => s.trim()) : [];

  const [allIds, setAllIds] = useState<TaggedId[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingSkeletons, setPendingSkeletons] = useState(BATCH_SIZE);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const euroPageRef = useRef(Math.floor(Math.random() * 400) + 1);

  useEffect(() => { document.title = "Main Archive | Reel Museum"; return () => { document.title = "Reel Museum"; }; }, []);

  // Deep-link: open artwork modal from ?artwork=ID (Met only)
  useEffect(() => {
    const artworkId = searchParams.get("artwork");
    if (artworkId) {
      fetchObject(Number(artworkId)).then((obj) => {
        if (obj) setSelectedArtwork(fromMetObject(obj));
      });
    }
  }, []);

  useEffect(() => {
    clearEuropeanaCollectionCache();
    abortRef.current?.abort();
    setArtworks([]);
    setCursor(0);
    euroPageRef.current = Math.floor(Math.random() * 400) + 1;
    setLoading(true);
    loadingRef.current = false;
    setPendingSkeletons(BATCH_SIZE);
    fetchMixedTextileIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0, euroPageRef.current);
    });
    return () => { abortRef.current?.abort(); prefetchAbortRef.current?.abort(); };
  }, [originsParam]);

  // Fires the same fetches as loadBatch but never touches React state — its
  // only purpose is to populate sessionStorage so the NEXT real loadBatch call
  // returns from cache immediately.
  const prefetchBatch = (ids: TaggedId[], start: number, euroPage: number) => {
    if (start >= ids.length) return;
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    const slice = ids.slice(start, start + BATCH_SIZE * 2);
    Promise.allSettled([
      ...slice.map((item) =>
        withTimeout(fetchArtwork(item, 1, controller.signal), 3000)
      ),
      withTimeout(fetchEuropeanaCollection(euroPage), 6000),
    ]);
  };

  const loadBatch = async (ids: TaggedId[], start: number, euroPage: number) => {
    if (start >= ids.length) return;
    // Do NOT abort the prefetch here — it may already be warming sessionStorage
    // for this exact batch. Reads are cache-first so there is no harm in both
    // running concurrently; the first to complete writes to sessionStorage and
    // subsequent reads return instantly.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    const slice = ids.slice(start, start + BATCH_SIZE * 2);
    setPendingSkeletons(BATCH_SIZE);

    const buffer: Artwork[] = [];

    const addItem = (artwork: Artwork | null) => {
      if (!artwork || controller.signal.aborted || !isCollectionPiece(artwork)) return;
      buffer.push(artwork);
    };

    // Flush buffer on interval, shuffling each flush so arrival order doesn't
    // dictate display order. 600ms window gives most cached items time to land.
    const flushInterval = setInterval(() => {
      if (buffer.length === 0 || controller.signal.aborted) return;
      const items = buffer.splice(0);
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      setArtworks((prev) => [...prev, ...items]);
    }, 600);

    await Promise.allSettled([
      ...slice.map((item) =>
        withTimeout(fetchArtwork(item, 1, controller.signal), 2500).then(addItem)
      ),
      withTimeout(
        fetchEuropeanaCollection(euroPage).then((items) => {
          if (!controller.signal.aborted)
            items.filter(isCollectionPiece).forEach((a) => addItem(a));
        }),
        4000
      ),
    ]);

    clearInterval(flushInterval);
    // Final flush — shuffle remaining items including any Europeana stragglers.
    if (buffer.length > 0 && !controller.signal.aborted) {
      const remaining = buffer.splice(0);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      setArtworks((prev) => [...prev, ...remaining]);
    }

    if (!controller.signal.aborted) {
      setCursor(start + slice.length);
      euroPageRef.current = Math.floor(Math.random() * 80) + 1;
      setLoading(false);
      setPendingSkeletons(0);
      loadingRef.current = false;

      // Kick off background prefetch for the next batch so items land in
      // sessionStorage before the user scrolls to trigger the real load.
      prefetchBatch(ids, start + slice.length, euroPageRef.current);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || cursor >= allIds.length) return;
    loadBatch(allIds, cursor, euroPageRef.current);
  }, [allIds, cursor]);

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

  const clearFilter = () => setSearchParams({});

  const filteredArtworks = origins.length > 0
    ? artworks.filter((art) => matchesOrigins(art, origins))
    : artworks;

  return (
    <div className="px-6 md:px-10 pb-20">
      {origins.length > 0 && (
        <div className="flex items-center gap-2 mb-6 mt-2 text-sm">
          <span className="text-muted-foreground">filtering by origins:</span>
          {origins.map((o) => (
            <span key={o} className="px-2 py-0.5 bg-muted rounded text-foreground text-xs font-medium">
              {o}
            </span>
          ))}
          <button
            onClick={clearFilter}
            className="ml-2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Clear filter"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {!origins.length && (
        <p className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl">
          every object tells a story.
        </p>
      )}

      {filteredArtworks.length === 0 && pendingSkeletons === 0 && !loading ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">no works found matching these origins yet.</p>
          <button onClick={clearFilter} className="mt-2 text-xs underline hover:text-foreground transition-colors">
            view all works
          </button>
        </div>
      ) : (
        <Masonry
          breakpointCols={MASONRY_BREAKPOINTS}
          className="masonry-grid"
          columnClassName="masonry-grid-col"
        >
          {filteredArtworks.map((art, i) => (
            <ArtworkCard
              key={`${art.museum}-${art.id}`}
              artwork={art}
              index={i % BATCH_SIZE}
              onClick={() => { setSelectedArtwork(art); recordExplored(`${art.museum}-${art.id}`); }}
            />
          ))}
          {pendingSkeletons > 0 && Array.from({ length: pendingSkeletons }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="mb-4 bg-muted animate-pulse rounded"
              style={{ height: "320px" }}
            />
          ))}
        </Masonry>
      )}

      <div ref={sentinelRef} className="h-1" />

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  );
};

export default Gallery;
