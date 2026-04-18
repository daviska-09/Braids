import { useCallback, useEffect, useRef, useState } from "react";

// /* AUDIO: paper unfold sound could be triggered here in phase 1 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = folded card visible
// 1 = right panel sweeps in (300ms)
// 2 = left panel sweeps in  (900ms)
// 3 = top panels sweep up   (1500ms)
// 4 = overlay fading out    (2200ms)
// 5 = done                  (2500ms)

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const PANEL_BG = "radial-gradient(ellipse at 55% 45%, hsl(50 36% 98.5%) 0%, hsl(48 26% 94%) 100%)";
const FOLD = "1px solid rgba(0,0,0,0.07)";

interface Props {
  onComplete(): void;
}

export default function MapFoldAnimation({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>(0);
  const timers = useRef<number[]>([]);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    timers.current = [
      window.setTimeout(() => setPhase(1), 300),
      window.setTimeout(() => setPhase(2), 900),
      window.setTimeout(() => setPhase(3), 1500),
      window.setTimeout(() => setPhase(4), 2200),
      window.setTimeout(finish, 2500),
    ];
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener("keydown", finish);
    };
  }, [finish]);

  const isMobile = window.innerWidth < 768;

  const rightY = phase >= 1 ? "rotateY(0deg)"  : "rotateY(-90deg)";
  const leftY  = phase >= 2 ? "rotateY(0deg)"  : "rotateY(90deg)";
  const topX   = phase >= 3 ? "rotateX(0deg)"  : "rotateX(-90deg)";

  const rightTx = phase === 1 ? `transform 600ms ${EASE}` : "none";
  const leftTx  = phase === 2 ? `transform 600ms ${EASE}` : "none";
  const topTx   = phase === 3 ? `transform 700ms ${EASE}` : "none";

  // Fills whatever container it's placed in
  return (
    <div
      className="w-full h-full relative flex items-center justify-center cursor-pointer"
      style={{
        opacity: phase >= 4 ? 0 : 1,
        transition: phase >= 4 ? "opacity 300ms ease-out" : "none",
        pointerEvents: phase >= 4 ? "none" : "auto",
      }}
      onClick={finish}
    >
      {isMobile ? (
        // Mobile: just a cream fill that fades out
        <div className="w-full h-full" style={{ background: "hsl(50 33% 97%)" }} />
      ) : (
        <div style={{ perspective: "1200px", width: "100%", height: "100%", position: "relative" }}>

          {/* ── Initial folded card (fades out in phase 1) ── */}
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 30, pointerEvents: "none",
              opacity: phase >= 1 ? 0 : 1,
              transition: phase === 1 ? "opacity 400ms" : "none",
            }}
          >
            <div
              style={{
                width: "38%", aspectRatio: "1.7/1",
                background: PANEL_BG,
                boxShadow: "2px 3px 18px rgba(0,0,0,0.13), 1px 1px 6px rgba(0,0,0,0.07), inset 3px 0 8px rgba(0,0,0,0.03)",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.11)" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.11)" }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.6)" }} />
            </div>
          </div>

          {/* ── 3D panel container ── */}
          <div style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}>

            {/* LEFT WRAPPER */}
            <div style={{
              position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
              transformStyle: "preserve-3d",
              transformOrigin: "right center",
              transform: leftY, transition: leftTx,
            }}>
              <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "50%", background: PANEL_BG, borderTop: FOLD, borderRight: FOLD }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "50%", transformOrigin: "center bottom", transform: topX, transition: topTx, background: PANEL_BG, borderBottom: FOLD, borderRight: FOLD }} />
            </div>

            {/* RIGHT WRAPPER */}
            <div style={{
              position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
              transformStyle: "preserve-3d",
              transformOrigin: "left center",
              transform: rightY, transition: rightTx,
            }}>
              <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "50%", background: PANEL_BG, borderTop: FOLD, borderLeft: FOLD }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "50%", transformOrigin: "center bottom", transform: topX, transition: topTx, background: PANEL_BG, borderBottom: FOLD, borderLeft: FOLD }} />
            </div>

            {/* Center fold lines */}
            {phase >= 1 && <>
              <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: "rgba(0,0,0,0.06)", pointerEvents: "none", zIndex: 10 }} />
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.06)", pointerEvents: "none", zIndex: 10 }} />
            </>}

            {/* Drop shadow */}
            <div style={{ position: "absolute", inset: 0, boxShadow: phase >= 3 ? "0 8px 48px rgba(0,0,0,0.1), 0 2px 12px rgba(0,0,0,0.06)" : "none", pointerEvents: "none", zIndex: 20, transition: "box-shadow 400ms" }} />
          </div>
        </div>
      )}

      {/* Skip */}
      <button
        className="absolute bottom-3 right-3 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors select-none"
        onClick={(e) => { e.stopPropagation(); finish(); }}
      >
        skip →
      </button>
    </div>
  );
}
