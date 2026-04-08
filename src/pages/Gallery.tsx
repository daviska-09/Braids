import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchTextileObjectIds, fetchBatch, fetchObject, type MetObject } from "@/lib/metApi";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import { X } from "lucide-react";

const BATCH_SIZE = 12;

function matchesOrigins(art: MetObject, origins: string[]): boolean {
  const fields = [
    art.artistNationality,
    art.country,
    art.culture,
    art.region,
    art.locale,
  ].map((f) => (f || "").toLowerCase());

  return origins.some((origin) => {
    const o = origin.toLowerCase();
    return fields.some((f) => f.includes(o));
  });
}

const Gallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const originsParam = searchParams.get("origins");
  const origins = originsParam ? originsParam.split(",").map((s) => s.trim()) : [];

  const [allIds, setAllIds] = useState<number[]>([]);
  const [artworks, setArtworks] = useState<MetObject[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<MetObject | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Deep-link: open artwork modal from ?artwork=ID
  useEffect(() => {
    const artworkId = searchParams.get("artwork");
    if (artworkId) {
      fetchObject(Number(artworkId)).then((obj) => {
        if (obj) setSelectedArtwork(obj);
      });
    }
  }, []);

  useEffect(() => {
    // Reset when origins change
    setArtworks([]);
    setCursor(0);
    setLoading(true);
    fetchTextileObjectIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0);
    });
  }, [originsParam]);

  const loadBatch = async (ids: number[], start: number) => {
    if (start >= ids.length) return;
    setLoadingMore(true);
    const slice = ids.slice(start, start + BATCH_SIZE * 3);
    const results = await fetchBatch(slice, BATCH_SIZE * 3);
    const valid = results.slice(0, BATCH_SIZE);
    setArtworks((prev) => [...prev, ...valid]);
    setCursor(start + BATCH_SIZE * 3);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || cursor >= allIds.length) return;
    loadBatch(allIds, cursor);
  }, [allIds, cursor, loadingMore]);

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

  const clearFilter = () => {
    setSearchParams({});
  };

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
          Every stitch tells a story.
        </p>
      )}

      {loading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 break-inside-avoid bg-muted animate-pulse"
              style={{ height: `${200 + Math.random() * 200}px` }}
            />
          ))}
        </div>
      ) : filteredArtworks.length === 0 ? (
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
              key={art.objectID}
              artwork={art}
              index={i % BATCH_SIZE}
              onClick={() => setSelectedArtwork(art)}
            />
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-10">
          <div className="w-4 h-4 border border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </div>
  );
};

export default Gallery;
