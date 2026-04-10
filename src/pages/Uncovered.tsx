import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Globe, { type GlobePoint } from "@/components/Globe";
import FlatMap from "@/components/FlatMap";
import { fetchTextileObjectIds } from "@/lib/metApi";

const EXPLORED_KEY = "reel_explored";

interface OriginEntry {
  label: string;
  count: number;
  lat: number;
  lng: number;
}

function generateDensePoints(base: GlobePoint[], count: number): GlobePoint[] {
  const result = [...base];
  for (let i = 0; i < count; i++) {
    const ref = base[Math.floor(Math.random() * base.length)];
    result.push({
      lat: ref.lat + (Math.random() - 0.5) * 12,
      lng: ref.lng + (Math.random() - 0.5) * 12,
      label: ref.label,
    });
  }
  return result;
}

const Uncovered = () => {
  const [totalIds, setTotalIds] = useState(0);
  const [explored, setExplored] = useState(0);
  const [view, setView] = useState<"globe" | "map">("globe");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [origins, setOrigins] = useState<OriginEntry[]>([]);
  const navigate = useNavigate();

  // Load validated textile origins from pre-built asset
  useEffect(() => {
    fetch("/textile-origins.json")
      .then((r) => r.json())
      .then((data: OriginEntry[]) => setOrigins(data))
      .catch(() => {/* silently fall back to empty */});
  }, []);

  useEffect(() => {
    fetchTextileObjectIds().then((ids) => {
      setTotalIds(ids.length);
      const stored = localStorage.getItem(EXPLORED_KEY);
      if (stored !== null) {
        setExplored(Number(stored));
      } else {
        const initial = Math.floor(ids.length * 0.07);
        setExplored(initial);
        localStorage.setItem(EXPLORED_KEY, String(initial));
      }
    });
  }, []);

  // Base points from real data; dense noise adds visual depth
  const basePoints = useMemo<GlobePoint[]>(
    () => origins.map(({ label, lat, lng }) => ({ label, lat, lng })),
    [origins]
  );

  const points = useMemo(
    () => (basePoints.length > 0 ? generateDensePoints(basePoints, 180) : []),
    [basePoints]
  );

  // Only labels from the validated origins set are clickable
  const validLabels = useMemo(
    () => new Set(origins.map((o) => o.label)),
    [origins]
  );

  const handleThreadClick = (originA: string, originB: string) => {
    const label = validLabels.has(originA) ? originA : originB;
    setSelectedLabel(label);
    const origins2 = Array.from(new Set([originA, originB].filter((l) => validLabels.has(l)))).join(",");
    navigate(`/?origins=${encodeURIComponent(origins2 || originA)}`);
  };

  const handleDotClick = (label: string) => {
    if (!validLabels.has(label)) return;
    setSelectedLabel(label);
    navigate(`/?origins=${encodeURIComponent(label)}`);
  };

  const handleReset = () => {
    const pw = prompt("password");
    if (pw === "reelmuseum") {
      setExplored(0);
      localStorage.setItem(EXPLORED_KEY, "0");
    }
  };

  return (
    <div className="px-6 md:px-10 pb-20 relative">
      <div className="max-w-xl mt-2 mb-12">
        <h1 className="font-serif text-3xl md:text-4xl font-normal mb-4">archive explored</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
          each dot is a work we've explored, placed where its origin is from. through these threads, we see how civilisation itself is constructed: not only by conquest and industry, but by the tangible and cultural forces that we have woven into our existence.{"\n\n\n"}
          the globe grows denser the more we discover.
        </p>
        <p className="text-xs text-muted-foreground/70 mb-2">
          click a thread or dot to explore items from that origin
        </p>

        {selectedLabel && (
          <p className="text-xs mb-4">
            <span className="text-foreground">filtering: {selectedLabel}</span>
            {" · "}
            <button
              onClick={() => setSelectedLabel(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              clear
            </button>
          </p>
        )}

        {totalIds > 0 && (
          <p className="text-sm mt-4">
            <span className="font-medium">{explored.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">works explored out of</span>{" "}
            <span className="font-medium">{totalIds.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">in the archive</span>
          </p>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-3 text-sm mb-6 justify-center">
        <button
          onClick={() => setView("globe")}
          className={view === "globe" ? "text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
        >
          globe
        </button>
        <span className="text-muted-foreground/40">·</span>
        <button
          onClick={() => setView("map")}
          className={view === "map" ? "text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
        >
          map
        </button>
      </div>

      <div className="flex justify-center">
        {view === "globe" ? (
          <div className="w-full max-w-lg aspect-square">
            <Globe
              points={points}
              onThreadClick={handleThreadClick}
              onDotClick={handleDotClick}
              selectedLabel={selectedLabel}
            />
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <FlatMap
              points={points}
              validLabels={validLabels}
              onLocationClick={handleDotClick}
              selectedLabel={selectedLabel}
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        {view === "globe" ? "drag to rotate" : "drag to pan"}, scroll to zoom
      </p>

      {/* Hidden admin reset */}
      <button
        onClick={handleReset}
        className="fixed bottom-4 right-4 text-[10px] text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors"
      >
        reset
      </button>
    </div>
  );
};

export default Uncovered;
