import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/artwork";
import { useTranslatedArtwork } from "@/hooks/useTranslatedArtwork";

interface ArtworkCardProps {
  artwork: Artwork;
  index: number;
  onClick: () => void;
}

const ArtworkCard = ({ artwork, index, onClick }: ArtworkCardProps) => {
  const display = useTranslatedArtwork(artwork) ?? artwork;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const placeholderPadding = useRef(`${100 + Math.random() * 60}%`);

  if (failed) return null;

  return (
    <motion.div
      className="relative cursor-pointer group mb-4 break-inside-avoid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        {!loaded && (
          <div className="w-full bg-muted animate-pulse" style={{ paddingBottom: placeholderPadding.current }} />
        )}
        <img
          src={artwork.imageSmall}
          alt={artwork.title}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            // Filter placeholder/icon images: too small, or small + nearly square
            if (w < 100 || h < 100 || (w <= 280 && h <= 280 && Math.abs(w - h) < 20)) {
              setFailed(true);
              return;
            }
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
          className={`w-full block transition-transform duration-700 ease-out ${
            loaded ? "opacity-100" : "opacity-0 absolute inset-0"
          } ${hovered ? "scale-[1.03]" : "scale-100"}`}
        />
        <motion.div
          className="absolute inset-0 bg-foreground/60 flex flex-col justify-end p-4"
          initial={false}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-primary-foreground text-sm font-serif leading-snug line-clamp-2">
            {display.title}
          </p>
          {display.artist && (
            <p className="text-primary-foreground/70 text-xs mt-1">
              {display.artist}
            </p>
          )}
          {display.date && (
            <p className="text-primary-foreground/50 text-xs mt-0.5">
              {display.date}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ArtworkCard;
