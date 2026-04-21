import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTextileObjectIds, fetchObject } from "@/lib/metApi";
import { fetchArtwork, fromMetObject, interleave, type Artwork, type TaggedId } from "@/lib/artwork";
import { fetchEuropeanaCollection } from "@/services/europeanaService";
import { isCollectionPiece } from "@/utils/textileFilters";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import { X } from "lucide-react";

const BATCH_SIZE = 11;
const EXPLORED_KEY = "reel_explored";
const seenIds = new Set<string>(); // per-session dedup

function recordExplored(id: string) {
  if (seenIds.has(id)) return;
  seenIds.add(id);
  const current = Number(localStorage.getItem(EXPLORED_KEY) ?? "0");
  localStorage.setItem(EXPLORED_KEY, String(current + 1));
}

function matchesOrigins(art: Artwork, origins: string[]): boolean {
  const fields = [art.artistNationality, art.country, art.culture, art.region]
    .map((f) => (f || "").toLowerCase());
  return origins.some((origin) => {
    const o = origin.toLowerCase();
    return fields.some((f) => f.includes(o));
  });
}

async function fetchMixedTextileIds(): Promise<TaggedId[]> {
  const [metIds, aicIds] = await Promise.all([
    fetchTextileObjectIds().then((ids) =>
      ids.map((id): TaggedId => ({ id, museum: "met" }))
    ),
    fetch("/aic-textile-ids.json")
      .then((r) => r.json())
      .then((ids: number[]) => ids.map((id): TaggedId => ({ id, museum: "aic" })))
      .catch(() => [] as TaggedId[]),
  ]);
  return interleave(metIds, aicIds);
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
  const euroPageRef = useRef(1);

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
    abortRef.current?.abort();
    setArtworks([]);
    setCursor(0);
    euroPageRef.current = 1;
    setLoading(true);
    loadingRef.current = false;
    setPendingSkeletons(BATCH_SIZE);
    fetchMixedTextileIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0, 1);
    });
    return () => { abortRef.current?.abort(); };
  }, [originsParam]);

  const loadBatch = async (ids: TaggedId[], start: number, euroPage: number) => {
    if (start >= ids.length) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    const slice = ids.slice(start, start + BATCH_SIZE * 2);
    setPendingSkeletons(BATCH_SIZE);

    await Promise.all([
      // Met + AIC items
      ...slice.map((item) =>
        fetchArtwork(item, 2, controller.signal).then((artwork) => {
          if (artwork && !controller.signal.aborted && isCollectionPiece(artwork)) {
            setArtworks((prev) => [...prev, artwork]);
            setPendingSkeletons((prev) => Math.max(0, prev - 1));
          }
        })
      ),
      // Europeana items (fetched in parallel with each batch)
      fetchEuropeanaCollection(euroPage).then((items) => {
        if (controller.signal.aborted) return;
        const filtered = items.filter(isCollectionPiece);
        if (filtered.length > 0) {
          setArtworks((prev) => [...prev, ...filtered]);
          setPendingSkeletons((prev) => Math.max(0, prev - filtered.length));
        }
      }),
    ]);

    if (!controller.signal.aborted) {
      setCursor(start + slice.length);
      euroPageRef.current = euroPage + 1;
      setLoading(false);
      setPendingSkeletons(0);
      loadingRef.current = false;
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
      { rootMargin: "600px" }
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
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
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

export default Gallery;
