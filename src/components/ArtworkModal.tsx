import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import type { Artwork } from "@/lib/artwork";
import { addActivity, removeActivity, getActivities, isArtworkSaved } from "@/lib/activityStore";
import { X, Link2, Mail, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface ArtworkModalProps {
  artwork: Artwork | null;
  onClose: () => void;
  note?: string;
  onNoteChange?: (note: string) => void;
}

const ArtworkModal = ({ artwork, onClose, note, onNoteChange }: ArtworkModalProps) => {
  const t = useT();
  const [showPostcard, setShowPostcard] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const openLightbox = () => { setLightbox(true); setScale(1); setPos({ x: 0, y: 0 }); };
  const closeLightbox = () => setLightbox(false);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(8, Math.max(1, s - e.deltaY * 0.001)));
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    setPos({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
  };
  const onMouseUp = () => { dragStart.current = null; };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);
  const [email, setEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [isSaved, setIsSaved] = useState(() => artwork ? isArtworkSaved(artwork.id) : false);
  const [imgSrc, setImgSrc] = useState(artwork?.imageSmall ?? "");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [localNote, setLocalNote] = useState(note ?? "");

  useEffect(() => { setLocalNote(note ?? ""); }, [note]);

  useEffect(() => {
    if (!artwork) return;
    setImgSrc(artwork.imageSmall);
    setImgLoaded(false);
    setImgFailed(false);
    setIsSaved(isArtworkSaved(artwork.id));

    // Mobile browsers often skip onLoad for cached images — probe cache directly
    const probe = new Image();
    probe.src = artwork.imageSmall;
    if (probe.complete) setImgLoaded(true);

    if (!artwork.imageFull) return;
    const full = new Image();
    full.src = artwork.imageFull;
    full.onload = () => setImgSrc(artwork.imageFull);
  }, [artwork?.id]);

  useEffect(() => {
    if (!artwork) return;
    supabase.rpc("increment_artwork_view", {
      p_artwork_id: artwork.id,
      p_source:     artwork.source,
      p_title:      artwork.title,
      p_image_url:  artwork.imageSmall || artwork.imageFull,
    });
  }, [artwork?.id]);

  if (!artwork) return null;

  const shareUrl = artwork.museum === "The Metropolitan Museum of Art"
    ? `${window.location.origin}/?artwork=${artwork.id}`
    : artwork.objectUrl;
  const viewLabel =
    artwork.source === "europeana" ? `${t.modal.viewOn} europeana.eu →` :
    artwork.museum === "The Metropolitan Museum of Art" ? `${t.modal.viewOn} metmuseum.org →` :
    `${t.modal.viewOn} artic.edu →`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t.modal.toastLinkCopied);
    } catch {
      toast(t.modal.toastCopyFail);
    }
  };

  const handleSave = () => {
    if (isSaved) {
      const entry = getActivities().find((a) => a.artworkId === artwork.id && a.action === "saved");
      if (entry) removeActivity(entry.id);
      setIsSaved(false);
      toast(t.modal.toastRemoved);
    } else {
      addActivity({
        artworkId: artwork.id,
        artworkTitle: artwork.title,
        artworkArtist: artwork.artist,
        artworkImage: artwork.imageSmall || artwork.imageFull,
        action: "saved",
        artworkArtistBio: artwork.artistBio,
        artworkDate: artwork.date,
        artworkMedium: artwork.medium,
        artworkDimensions: artwork.dimensions,
        artworkCulture: artwork.culture,
        artworkCountry: artwork.country,
        artworkRegion: artwork.region,
        artworkClassification: artwork.classification,
        artworkDepartment: artwork.department,
        artworkCredit: artwork.credit,
        artworkObjectUrl: artwork.objectUrl,
        artworkMuseum: artwork.museum,
        artworkSource: artwork.source,
      });
      setIsSaved(true);
      toast(t.modal.toastSaved);
    }
  };

  const handleSendPostcard = () => {
    if (!email) return;
    const senderFirstName = senderName.trim() || "Someone";
    const subject = encodeURIComponent(`${senderFirstName} sent you a dispatch from The Reel Museum`);
    const body = encodeURIComponent(
      `I came across this piece and wanted to share with you.\n\n"${artwork.title}"${artwork.artist ? ` by ${artwork.artist}` : ""}${artwork.date ? `, ${artwork.date}` : ""}\n\nView it here: ${shareUrl}\n\nThe Reel Museum is a museum without walls, celebrating 5,000 years of textiles and human craftsmanship. Scroll, discover and share pieces from human history around the globe.\n\nExplore the archives at The Reel Museum: https://reelmuseum.com`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
    addActivity({
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artworkArtist: artwork.artist,
      artworkImage: artwork.imageSmall || artwork.imageFull,
      action: "sent",
      recipientHint: email.split("@")[0],
      artworkArtistBio: artwork.artistBio,
      artworkDate: artwork.date,
      artworkMedium: artwork.medium,
      artworkDimensions: artwork.dimensions,
      artworkCulture: artwork.culture,
      artworkCountry: artwork.country,
      artworkRegion: artwork.region,
      artworkClassification: artwork.classification,
      artworkDepartment: artwork.department,
      artworkCredit: artwork.credit,
      artworkObjectUrl: artwork.objectUrl,
      artworkMuseum: artwork.museum,
      artworkSource: artwork.source,
    });
    toast(t.modal.toastDispatched);
    setEmail("");
    setSenderName("");
    setShowPostcard(false);
  };

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
            <div className="md:w-1/2 bg-muted flex items-center justify-center p-6 relative min-h-[200px]">
              {!imgLoaded && !imgFailed && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              {!imgFailed && (
                <img
                  src={imgSrc}
                  alt={artwork.title}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgFailed(true)}
                  onClick={imgLoaded ? openLightbox : undefined}
                  className={`max-h-[60vh] object-contain relative transition-opacity duration-300 ${imgLoaded ? "opacity-100 cursor-zoom-in" : "opacity-0"}`}
                />
              )}
            </div>
            <div className="md:w-1/2 p-8 flex flex-col justify-center">
              <h2 className="font-serif text-xl leading-snug mb-3">{artwork.title}</h2>
              {artwork.artist && (
                <p className="text-sm text-muted-foreground mb-1">{artwork.artist}</p>
              )}
              {artwork.artistBio && (
                <p className="text-xs text-muted-foreground mb-4">{artwork.artistBio}</p>
              )}
              <div className="space-y-2 text-xs text-muted-foreground">
                {artwork.date && <Detail label={t.modal.date} value={artwork.date} />}
                {artwork.medium && <Detail label={t.modal.medium} value={artwork.medium} />}
                {artwork.dimensions && <Detail label={t.modal.dimensions} value={artwork.dimensions} />}
                {artwork.culture && <Detail label={t.modal.culture} value={artwork.culture} />}
                {artwork.classification && <Detail label={t.modal.classification} value={artwork.classification} />}
                {artwork.department && <Detail label={t.modal.department} value={artwork.department} />}
                {artwork.credit && <Detail label={t.modal.credit} value={artwork.credit} />}
              </div>

              {onNoteChange && (
                <textarea
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim();
                    if (val !== (note ?? "").trim()) onNoteChange(val);
                  }}
                  placeholder={t.modal.addNote}
                  rows={2}
                  className="mt-4 w-full resize-none bg-transparent text-xs text-foreground/70 placeholder:text-foreground/25 outline-none border-none focus:ring-0 leading-relaxed"
                />
              )}

              {/* Share actions */}
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${isSaved ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} /> {isSaved ? t.modal.saved : t.modal.saveToCollection}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" /> {t.modal.copyLink}
                </button>
                <button
                  onClick={() => setShowPostcard((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> {t.modal.dispatch}
                </button>
              </div>

              {showPostcard && (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={t.modal.yourName}
                    className="text-xs px-3 py-1.5 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    onKeyDown={(e) => e.key === "Enter" && handleSendPostcard()}
                  />
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.modal.recipientPlaceholder}
                      className="flex-1 text-xs px-3 py-1.5 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      onKeyDown={(e) => e.key === "Enter" && handleSendPostcard()}
                    />
                    <button
                      onClick={handleSendPostcard}
                      className="text-xs px-3 py-1.5 bg-accent text-accent-foreground rounded hover:opacity-90 transition-opacity"
                    >
                      {t.modal.send}
                    </button>
                  </div>
                </div>
              )}

              {artwork.objectUrl && (
                <a
                  href={artwork.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-xs text-accent hover:underline"
                >
                  {viewLabel}
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
          onWheel={onWheel}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>
          <img
            src={imgSrc}
            alt={artwork.title}
            onMouseDown={onMouseDown}
            style={{
              transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
              transformOrigin: "center center",
              transition: dragStart.current ? "none" : "transform 0.15s ease",
              cursor: scale > 1 ? "grab" : "zoom-in",
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              userSelect: "none",
            }}
            onClick={() => {
              if (scale === 1) setScale(2.5);
              else { setScale(1); setPos({ x: 0, y: 0 }); }
            }}
            draggable={false}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
            {t.modal.zoomHint}
          </p>
        </div>
      )}
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
