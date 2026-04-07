import { useState, useEffect, useMemo } from "react";
import Globe from "@/components/Globe";
import { fetchTextileObjectIds } from "@/lib/metApi";

// Sample geographic points representing major textile traditions
const SAMPLE_POINTS = [
  { lat: 35.68, lng: 139.69 }, // Tokyo
  { lat: 28.61, lng: 77.23 },  // Delhi
  { lat: 31.23, lng: 121.47 }, // Shanghai
  { lat: 40.71, lng: -74.01 }, // NYC
  { lat: 51.51, lng: -0.13 },  // London
  { lat: 48.86, lng: 2.35 },   // Paris
  { lat: 41.01, lng: 28.98 },  // Istanbul
  { lat: 30.04, lng: 31.24 },  // Cairo
  { lat: 33.87, lng: 35.51 },  // Beirut
  { lat: 13.76, lng: 100.50 }, // Bangkok
  { lat: -6.21, lng: 106.85 }, // Jakarta
  { lat: 37.57, lng: 126.98 }, // Seoul
  { lat: 39.90, lng: 116.40 }, // Beijing
  { lat: 19.43, lng: -99.13 }, // Mexico City
  { lat: -12.05, lng: -77.04 },// Lima
  { lat: -33.87, lng: 151.21 },// Sydney
  { lat: 55.76, lng: 37.62 },  // Moscow
  { lat: 35.69, lng: 51.39 },  // Tehran
  { lat: 6.52, lng: 3.38 },    // Lagos
  { lat: -1.29, lng: 36.82 },  // Nairobi
  { lat: 34.05, lng: -118.24 },// LA
  { lat: 41.90, lng: 12.50 },  // Rome
  { lat: 23.81, lng: 90.41 },  // Dhaka
  { lat: 27.71, lng: 85.32 },  // Kathmandu
  { lat: 14.60, lng: 120.98 }, // Manila
  { lat: 36.72, lng: 3.09 },   // Algiers
  { lat: 33.59, lng: -7.62 },  // Casablanca
  { lat: -23.55, lng: -46.63 },// São Paulo
  { lat: 52.52, lng: 13.41 },  // Berlin
  { lat: 59.33, lng: 18.07 },  // Stockholm
];

// Generate more random points around existing ones for density
function generateDensePoints(base: typeof SAMPLE_POINTS, count: number) {
  const result = [...base];
  for (let i = 0; i < count; i++) {
    const ref = base[Math.floor(Math.random() * base.length)];
    result.push({
      lat: ref.lat + (Math.random() - 0.5) * 15,
      lng: ref.lng + (Math.random() - 0.5) * 15,
    });
  }
  return result;
}

const Uncovered = () => {
  const [totalIds, setTotalIds] = useState(0);
  const [explored, setExplored] = useState(0);

  useEffect(() => {
    fetchTextileObjectIds().then((ids) => {
      setTotalIds(ids.length);
      setExplored(Math.floor(ids.length * 0.07));
    });
  }, []);

  const points = useMemo(() => generateDensePoints(SAMPLE_POINTS, 200), []);

  return (
    <div className="px-6 md:px-10 pb-20">
      <div className="max-w-xl mt-2 mb-12">
        <h1 className="font-serif text-3xl md:text-4xl font-normal mb-4">archive explored</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          each dot is a work we've explored, placed where its origin is from. the
          globe grows denser the more we discover.
        </p>
        {totalIds > 0 && (
          <p className="text-sm">
            <span className="font-medium">{explored.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">works explored out of</span>{" "}
            <span className="font-medium">{totalIds.toLocaleString()}</span>{" "}
            <span className="text-muted-foreground">in the archive</span>
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-lg aspect-square">
          <Globe points={points} />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4">
        drag to rotate, pinch to zoom
      </p>
    </div>
  );
};

export default Uncovered;
