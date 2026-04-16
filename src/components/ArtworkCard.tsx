import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/artwork";

interface ArtworkCardProps {
  artwork: Artwork;
  index: number;
  onClick: () => void;
}

const ArtworkCard = ({ artwork, index, onClick }: ArtworkCardProps) => {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const placeholderPadding = useRef(`${100 + Math.random() * 60}%`);

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
          loading="lazy"
          onLoad={() => setLoaded(true)}
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
            {artwork.title}
          </p>
          {artwork.artist && (
            <p className="text-primary-foreground/70 text-xs mt-1">
              {artwork.artist}
            </p>
          )}
          {artwork.date && (
            <p className="text-primary-foreground/50 text-xs mt-0.5">
              {artwork.date}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ArtworkCard;
