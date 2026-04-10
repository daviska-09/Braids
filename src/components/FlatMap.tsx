import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { GlobePoint } from "./Globe";

interface FlatMapProps {
  points: GlobePoint[];
  validLabels?: Set<string>;
  onLocationClick?: (label: string) => void;
  selectedLabel?: string | null;
}

const W = 800;
const H = 400;
const MIN_SCALE = 0.9;
const MAX_SCALE = 5;

function project(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  };
}

function ringToD(ring: number[][]): string {
  if (ring.length === 0) return "";
  return (
    ring
      .map(([lng, lat], i) => {
        const x = (((lng + 180) / 360) * W).toFixed(2);
        const y = (((90 - lat) / 180) * H).toFixed(2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join("") + "Z"
  );
}

function geometryToD(geometry: GeoJSON.Geometry | null): string {
  if (!geometry) return "";
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToD).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((p) => p.map(ringToD)).join(" ");
  }
  return "";
}

function generateConnections(pts: { x: number; y: number }[], maxThreads = 150) {
  const connections: [number, number][] = [];
  const maxDist = 130;
  for (let i = 0; i < pts.length; i++) {
    const neighbors: { idx: number; dist: number }[] = [];
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < maxDist) neighbors.push({ idx: j, dist: d });
    }
    neighbors.sort((a, b) => a.dist - b.dist);
    for (const n of neighbors.slice(0, 3)) {
      connections.push([i, n.idx]);
      if (connections.length >= maxThreads) return connections;
    }
  }
  return connections;
}

// World outlines — loaded once, shared across renders
let worldFeaturesCache: GeoJSON.Feature[] | null = null;

const WorldOutlines = () => {
  const [features, setFeatures] = useState<GeoJSON.Feature[]>(worldFeaturesCache ?? []);

  useEffect(() => {
    if (worldFeaturesCache) { setFeatures(worldFeaturesCache); return; }
    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        const geo = feature(topo, topo.objects.countries as any);
        worldFeaturesCache = (geo as any).features;
        setFeatures(worldFeaturesCache!);
      })
      .catch(() => {/* outlines unavailable — silent */});
  }, []);

  return (
    <>
      {features.map((f, i) => {
        const d = geometryToD(f.geometry as GeoJSON.Geometry);
        if (!d) return null;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.4}
            strokeOpacity={0.2}
            className="pointer-events-none text-foreground"
          />
        );
      })}
    </>
  );
};

const FlatMap = ({ points, validLabels, onLocationClick, selectedLabel }: FlatMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [xform, setXform] = useState({ scale: 1, tx: 0, ty: 0 });
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

  const projected = useMemo(() => points.map((p) => project(p.lat, p.lng)), [points]);
  const connections = useMemo(() => generateConnections(projected), [projected]);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }, []);

  const applyZoom = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const { x: mx, y: my } = getSvgPoint(clientX, clientY);
      setXform((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        const ratio = newScale / prev.scale;
        return { scale: newScale, tx: mx + (prev.tx - mx) * ratio, ty: my + (prev.ty - my) * ratio };
      });
    },
    [getSvgPoint]
  );

  const applyPan = useCallback((dxClient: number, dyClient: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setXform((prev) => ({
      ...prev,
      tx: prev.tx + (dxClient / rect.width) * W,
      ty: prev.ty + (dyClient / rect.height) * H,
    }));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(e.clientX, e.clientY, 1 - e.deltaY * 0.001);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        lastPinchDist.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      } else if (e.touches.length === 1) {
        isPanning.current = true;
        didPan.current = false;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        if (lastPinchDist.current > 0) applyZoom(cx, cy, dist / lastPinchDist.current);
        lastPinchDist.current = dist;
      } else if (e.touches.length === 1 && isPanning.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - lastPos.current.x;
        const dy = e.touches[0].clientY - lastPos.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
        applyPan(dx, dy);
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => { isPanning.current = false; lastPinchDist.current = 0; };

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("touchstart", onTouchStart, { passive: true });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom, applyPan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    didPan.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
    applyPan(dx, dy);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { isPanning.current = false; };

  const handleElementClick = (label: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!didPan.current) onLocationClick?.(label);
  };

  const isClickable = (label: string) =>
    !validLabels || validLabels.has(label);

  const { scale, tx, ty } = xform;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
        {/* Country outlines — rendered first so they sit behind everything */}
        <WorldOutlines />

        {/* Thread lines */}
        {connections.map(([iA, iB], i) => {
          const a = projected[iA];
          const b = projected[iB];
          const labelA = points[iA]?.label;
          const labelB = points[iB]?.label;
          const isSelected =
            !!selectedLabel && (labelA === selectedLabel || labelB === selectedLabel);
          const clickable = isClickable(labelA || "") || isClickable(labelB || "");
          return (
            <line
              key={`t-${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isSelected ? "#222" : "#999"}
              strokeOpacity={isSelected ? 0.5 : 0.15}
              strokeWidth={isSelected ? 0.8 : 0.5}
              className={clickable ? "cursor-pointer" : "pointer-events-none"}
              onClick={clickable ? handleElementClick(labelA || labelB || "") : undefined}
            />
          );
        })}

        {/* Dots */}
        {projected.map((p, i) => {
          const label = points[i]?.label ?? "";
          const isSelected = !!selectedLabel && label === selectedLabel;
          const clickable = isClickable(label);
          return (
            <circle
              key={`d-${i}`}
              cx={p.x} cy={p.y}
              r={isSelected ? 2.5 : 1.5}
              fill={isSelected ? "#111" : clickable ? "#333" : "#aaa"}
              opacity={isSelected ? 1 : clickable ? 0.7 : 0.35}
              className={clickable ? "cursor-pointer" : "pointer-events-none"}
              onClick={clickable ? handleElementClick(label) : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
};

export default FlatMap;
