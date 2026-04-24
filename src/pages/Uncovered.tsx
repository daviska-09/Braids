import { useState, useEffect, useRef } from "react";
import { EXPLORED_KEY, getGlobalExploredCount, resetGlobalExploredCount } from "@/lib/exploredCounter";

// ── Hidden for redesign — do not delete ──
// import { useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import Globe, { type GlobePoint } from "@/components/Globe";
// import FlatMap from "@/components/FlatMap";
// import MapFoldAnimation from "@/components/MapFoldAnimation";
// import { fetchTextileObjectIds } from "@/lib/metApi";

const TOTAL_CACHE_KEY = "reel_total_combined";
const TOTAL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── Hidden for redesign — do not delete ──
// interface OriginEntry { label: string; count: number; lat: number; lng: number; }
//
// function generateDensePoints(base: GlobePoint[], count: number): GlobePoint[] {
//   const result = [...base];
//   for (let i = 0; i < count; i++) {
//     const ref = base[Math.floor(Math.random() * base.length)];
//     result.push({ lat: ref.lat + (Math.random() - 0.5) * 12, lng: ref.lng + (Math.random() - 0.5) * 12, label: ref.label });
//   }
//   return result;
// }

async function fetchCombinedTotal(): Promise<number> {
  const cached = sessionStorage.getItem(TOTAL_CACHE_KEY);
  if (cached) {
    const { total, ts } = JSON.parse(cached);
    if (Date.now() - ts < TOTAL_CACHE_TTL) return total as number;
  }

  const [met, aic, euro] = await Promise.all([
    fetch("https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=textiles")
      .then((r) => r.json()).then((d) => (d.total as number) ?? 115000).catch(() => 115000),
    fetch("https://api.artic.edu/api/v1/artworks/search?q=textiles&query[term][is_public_domain]=true&limit=1")
      .then((r) => r.json()).then((d) => (d.pagination?.total as number) ?? 16000).catch(() => 16000),
    fetch(`https://api.europeana.eu/record/v2/search.json?wskey=${import.meta.env.VITE_EUROPEANA_API_KEY}&query=textiles+OR+lace+OR+embroidery&qf=TYPE:IMAGE&rows=1`)
      .then((r) => r.json()).then((d) => (d.itemsCount?.totalResults as number) ?? 48000).catch(() => 48000),
  ]);

  const total = met + aic + euro;
  sessionStorage.setItem(TOTAL_CACHE_KEY, JSON.stringify({ total, ts: Date.now() }));
  return total;
}

const Uncovered = () => {
  const [totalIds, setTotalIds]               = useState<number | null>(null);
  const [explored, setExplored]               = useState(0);
  const [displayExplored, setDisplayExplored] = useState(0);
  const [globalExplored, setGlobalExplored]   = useState<number | null>(null);
  const [resetOpen, setResetOpen]             = useState(false);
  const [resetVal, setResetVal]               = useState("");
  const prevExploredRef = useRef(0);
  const animFrameRef    = useRef<number>(0);

  // ── Hidden for redesign — do not delete ──
  // const [animDone, setAnimDone]           = useState(false);
  // const [view, setView]                   = useState<"globe" | "map">("globe");
  // const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  // const [origins, setOrigins]             = useState<OriginEntry[]>([]);
  // const navigate = useNavigate();

  // ── Hidden: origins fetch ──
  // useEffect(() => {
  //   fetch("/textile-origins.json").then(r => r.json()).then(setOrigins).catch(() => {});
  // }, []);

  // ── Hidden: old Met-only total + explored seed ──
  // useEffect(() => {
  //   fetchTextileObjectIds().then((ids) => {
  //     setTotalIds(ids.length);
  //     const stored = localStorage.getItem(EXPLORED_KEY);
  //     if (stored !== null) { setExplored(Number(stored)); }
  //     else { const initial = Math.floor(ids.length * 0.07); setExplored(initial); localStorage.setItem(EXPLORED_KEY, String(initial)); }
  //   });
  // }, []);

  // Fetch combined total from all sources; seed explored on first visit
  useEffect(() => {
    fetchCombinedTotal()
      .catch(() => 115000 + 16000 + 48000)
      .then((total) => {
        setTotalIds(total);
        if (localStorage.getItem(EXPLORED_KEY) === null) {
          const seed = Math.floor(total * 0.07);
          localStorage.setItem(EXPLORED_KEY, String(seed));
          setExplored(seed);
        }
      });
  }, []);

  // Fetch global counter from Supabase once on mount
  useEffect(() => {
    getGlobalExploredCount().then(setGlobalExplored);
  }, []);

  // Poll localStorage every 2s so counter updates while user browses collection
  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(EXPLORED_KEY);
      if (stored !== null) setExplored(Number(stored));
    };
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, []);

  // Count-up animation when explored increases
  useEffect(() => {
    const prev = prevExploredRef.current;
    prevExploredRef.current = explored;
    if (explored <= prev) {
      setDisplayExplored(explored);
      return;
    }
    const start = performance.now();
    const duration = 600;
    const from = prev;
    const to = explored;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayExplored(Math.round(from + (to - from) * eased));
      if (t < 1) animFrameRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [explored]);

  // ── Hidden: derived points + handlers — do not delete ──
  // const basePoints = useMemo<GlobePoint[]>(() => origins.map(({ label, lat, lng }) => ({ label, lat, lng })), [origins]);
  // const points = useMemo(() => basePoints.length > 0 ? generateDensePoints(basePoints, 180) : [], [basePoints]);
  // const validLabels = useMemo(() => new Set(origins.map((o) => o.label)), [origins]);
  // const handleAnimComplete = () => setAnimDone(true);
  // const handleThreadClick = (originA: string, originB: string) => {
  //   const label = validLabels.has(originA) ? originA : originB;
  //   setSelectedLabel(label);
  //   const origins2 = Array.from(new Set([originA, originB].filter(l => validLabels.has(l)))).join(",");
  //   navigate(`/?origins=${encodeURIComponent(origins2 || originA)}`);
  // };
  // const handleDotClick = (label: string) => {
  //   if (!validLabels.has(label)) return;
  //   setSelectedLabel(label);
  //   navigate(`/?origins=${encodeURIComponent(label)}`);
  // };

  const handleResetSubmit = () => {
    if (resetVal === "reelmuseum") {
      setExplored(0);
      setGlobalExplored(0);
      localStorage.setItem(EXPLORED_KEY, "0");
      resetGlobalExploredCount();
    }
    setResetOpen(false);
    setResetVal("");
  };

  const loading = totalIds === null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 relative">
      <div className="text-center max-w-xl">
        <h1 className="font-serif text-4xl md:text-6xl font-normal mb-8">
          archive explored
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mb-8">
          {loading ? (
            <>— objects explored out of — in the Reel Museum</>
          ) : (
            <>
              <span className="font-medium" style={{ color: "#3AACAC" }}>
                {(globalExplored ?? displayExplored).toLocaleString()}
              </span>
              {" "}objects explored out of{" "}
              <span className="font-medium" style={{ color: "#3AACAC" }}>
                {totalIds.toLocaleString()}
              </span>
              {" "}in the Reel Museum
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          through these objects we see how civilisation is constructed: not only by conquest and industrialisation, but by the tangible and cultural forces that we have woven into our existence.
        </p>
        <a href="/" className="inline-flex flex-col items-center gap-2 group">
          <img
            src="/whorl.png"
            alt="spindle whorl"
            className="w-28 animate-spin opacity-80 group-hover:opacity-100 group-active:opacity-60 transition-opacity duration-500"
            style={{ animationDuration: "8s" }}
          />
          <span className="text-sm text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            click the spindle whorl to return to feed
          </span>
        </a>
      </div>

      {/* ── HIDDEN FOR REDESIGN — DO NOT DELETE ──

      View toggle:
        <div className="flex items-center gap-3 text-sm mb-6 justify-center">
          <button onClick={() => setView("globe")} ...>globe</button>
          <span>·</span>
          <button onClick={() => setView("map")} ...>map</button>
        </div>

      Map / Globe section:
        <div className="flex justify-center">
          {view === "globe" ? (
            <div className="w-full max-w-2xl aspect-square relative">
              {!animDone && <div className="absolute inset-0 z-10"><MapFoldAnimation onComplete={handleAnimComplete} /></div>}
              <Globe points={points} onThreadClick={handleThreadClick} onDotClick={handleDotClick} selectedLabel={selectedLabel} />
            </div>
          ) : (
            <div className="w-full max-w-3xl relative">
              {!animDone && <div className="absolute inset-0 z-10"><MapFoldAnimation onComplete={handleAnimComplete} /></div>}
              <FlatMap points={points} validLabels={validLabels} onLocationClick={handleDotClick} selectedLabel={selectedLabel} />
              <div className="pointer-events-none absolute inset-0">
                <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"rgba(0,0,0,0.06)" }} />
                <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,0.06)" }} />
              </div>
            </div>
          )}
        </div>

      Hint text:
        <p className="text-center text-xs text-muted-foreground mt-4">
          {view === "globe" ? "drag to rotate" : "drag to pan"}, scroll to zoom
        </p>

      Description + instructions (above globe section):
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
          each dot is a work we've explored... the globe grows denser the more we discover.
        </p>
        <p className="text-xs text-muted-foreground/70 mb-2">click a thread or dot to explore items from that origin</p>

      selectedLabel filter pill:
        {selectedLabel && (
          <p className="text-xs mb-4">
            <span>filtering: {selectedLabel}</span> · <button onClick={() => setSelectedLabel(null)}>clear</button>
          </p>
        )}

      ── END HIDDEN ── */}

      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        {resetOpen && (
          <input
            autoFocus
            type="text"
            value={resetVal}
            onChange={(e) => setResetVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleResetSubmit(); if (e.key === "Escape") { setResetOpen(false); setResetVal(""); } }}
            placeholder="password"
            className="text-[10px] border-b border-muted-foreground/30 bg-transparent outline-none w-20 text-muted-foreground placeholder:text-muted-foreground/30"
          />
        )}
        <button
          onClick={() => resetOpen ? handleResetSubmit() : setResetOpen(true)}
          className="text-[10px] text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors"
        >
          reset
        </button>
      </div>
    </div>
  );
};

export default Uncovered;
