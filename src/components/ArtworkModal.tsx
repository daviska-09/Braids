import { motion, AnimatePresence } from "framer-motion";
import type { MetObject } from "@/lib/metApi";
import { X } from "lucide-react";

interface ArtworkModalProps {
  artwork: MetObject | null;
  onClose: () => void;
}

const ArtworkModal = ({ artwork, onClose }: ArtworkModalProps) => {
  if (!artwork) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 bg-background max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-muted flex items-center justify-center p-6">
              <img
                src={artwork.primaryImage || artwork.primaryImageSmall}
                alt={artwork.title}
                className="max-h-[60vh] object-contain"
              />
            </div>
            <div className="md:w-1/2 p-8 flex flex-col justify-center">
              <h2 className="font-serif text-xl leading-snug mb-3">{artwork.title}</h2>
              {artwork.artistDisplayName && (
                <p className="text-sm text-muted-foreground mb-1">{artwork.artistDisplayName}</p>
              )}
              {artwork.artistDisplayBio && (
                <p className="text-xs text-muted-foreground mb-4">{artwork.artistDisplayBio}</p>
              )}
              <div className="space-y-2 text-xs text-muted-foreground">
                {artwork.objectDate && <Detail label="Date" value={artwork.objectDate} />}
                {artwork.medium && <Detail label="Medium" value={artwork.medium} />}
                {artwork.dimensions && <Detail label="Dimensions" value={artwork.dimensions} />}
                {artwork.culture && <Detail label="Culture" value={artwork.culture} />}
                {artwork.classification && <Detail label="Classification" value={artwork.classification} />}
                {artwork.department && <Detail label="Department" value={artwork.department} />}
                {artwork.creditLine && <Detail label="Credit" value={artwork.creditLine} />}
              </div>
              {artwork.objectURL && (
                <a
                  href={artwork.objectURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 text-xs text-accent hover:underline"
                >
                  View on metmuseum.org →
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-foreground/50">{label}:</span>{" "}
    <span className="text-foreground/80">{value}</span>
  </div>
);

export default ArtworkModal;
