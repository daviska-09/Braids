import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Globe, { type GlobePoint } from "@/components/Globe";
import FlatMap from "@/components/FlatMap";
import { fetchTextileObjectIds } from "@/lib/metApi";

const EXPLORED_KEY = "reel_explored";

const SAMPLE_POINTS: GlobePoint[] = [
  { lat: 35.68, lng: 139.69, label: "Japan" },
  { lat: 28.61, lng: 77.23, label: "India" },
  { lat: 31.23, lng: 121.47, label: "China" },
  { lat: 40.71, lng: -74.01, label: "United States" },
  { lat: 51.51, lng: -0.13, label: "United Kingdom" },
  { lat: 48.86, lng: 2.35, label: "France" },
  { lat: 41.01, lng: 28.98, label: "Turkey" },
  { lat: 30.04, lng: 31.24, label: "Egypt" },
  { lat: 33.87, lng: 35.51, label: "Lebanon" },
  { lat: 13.76, lng: 100.50, label: "Thailand" },
  { lat: -6.21, lng: 106.85, label: "Indonesia" },
  { lat: 37.57, lng: 126.98, label: "South Korea" },
  { lat: 39.90, lng: 116.40, label: "China" },
  { lat: 19.43, lng: -99.13, label: "Mexico" },
  { lat: -12.05, lng: -77.04, label: "Peru" },
  { lat: -33.87, lng: 151.21, label: "Australia" },
  { lat: 55.76, lng: 37.62, label: "Russia" },
  { lat: 35.69, lng: 51.39, label: "Iran" },
  { lat: 6.52, lng: 3.38, label: "Nigeria" },
  { lat: -1.29, lng: 36.82, label: "Kenya" },
  { lat: 34.05, lng: -118.24, label: "United States" },
  { lat: 41.90, lng: 12.50, label: "Italy" },
  { lat: 23.81, lng: 90.41, label: "Bangladesh" },
  { lat: 27.71, lng: 85.32, label: "Nepal" },
  { lat: 14.60, lng: 120.98, label: "Philippines" },
  { lat: 36.72, lng: 3.09, label: "Algeria" },
  { lat: 33.59, lng: -7.62, label: "Morocco" },
  { lat: -23.55, lng: -46.63, label: "Brazil" },
  { lat: 52.52, lng: 13.41, label: "Germany" },
  { lat: 59.33, lng: 18.07, label: "Sweden" },
];

function generateDensePoints(base: GlobePoint[], count: number): GlobePoint[] {
  const result = [...base];
  for (let i = 0; i < count; i++) {
    const ref = base[Math.floor(Math.random() * base.length)];
    result.push({
      lat: ref.lat + (Math.random() - 0.5) * 15,
      lng: ref.lng + (Math.random() - 0.5) * 15,
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
  const navigate = useNavigate();

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

  const points = useMemo(() => generateDensePoints(SAMPLE_POINTS, 200), []);

  const handleThreadClick = (originA: string, originB: string) => {
    setSelectedLabel(originA);
    const origins = Array.from(new Set([originA, originB])).join(",");
    navigate(`/?origins=${encodeURIComponent(origins)}`);
  };

  const handleDotClick = (label: string) => {
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
