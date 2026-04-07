import { useState, useEffect, useCallback, useRef } from "react";
import { fetchTextileObjectIds, fetchBatch, type MetObject } from "@/lib/metApi";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";

const BATCH_SIZE = 12;

const Gallery = () => {
  const [allIds, setAllIds] = useState<number[]>([]);
  const [artworks, setArtworks] = useState<MetObject[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<MetObject | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTextileObjectIds().then((ids) => {
      setAllIds(ids);
      loadBatch(ids, 0);
    });
  }, []);

  const loadBatch = async (ids: number[], start: number) => {
    if (start >= ids.length) return;
    setLoadingMore(true);
    const slice = ids.slice(start, start + BATCH_SIZE * 3); // fetch more to filter nulls
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

  return (
    <div className="px-6 md:px-10 pb-20">
      <p className="font-serif text-lg md:text-xl text-foreground/80 mt-2 mb-10 max-w-xl">
        Every stitch tells a story.
      </p>

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
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {artworks.map((art, i) => (
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
