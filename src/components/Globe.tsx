import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

export interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
}

interface GlobeProps {
  points: GlobePoint[];
  onThreadClick?: (originA: string, originB: string) => void;
  onDotClick?: (label: string) => void;
  selectedLabel?: string | null;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function generateThreads(positions: THREE.Vector3[], maxThreads = 150) {
  const connections: [number, number][] = [];
  const maxDist = 1.2;
  for (let i = 0; i < positions.length; i++) {
    const neighbors: { idx: number; dist: number }[] = [];
    for (let j = i + 1; j < positions.length; j++) {
      const d = positions[i].distanceTo(positions[j]);
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

const DEFAULT_THREAD = 0x999999;
const SELECTED_THREAD = 0x222222;
const HOVER_THREAD = 0x444444;

const Globe = ({ points, onThreadClick, onDotClick, selectedLabel }: GlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: 0 });
  const zoomLevel = useRef(3);
  const selectedLabelRef = useRef(selectedLabel);
  const updateSelectionRef = useRef<((label: string | null | undefined) => void) | null>(null);

  const dotPositions = useMemo(
    () => points.map((p) => latLngToVector3(p.lat, p.lng, 1)),
    [points]
  );
  const threads = useMemo(() => generateThreads(dotPositions), [dotPositions]);

  // Keep ref in sync for use inside event handler closures
  useEffect(() => {
    selectedLabelRef.current = selectedLabel;
  }, [selectedLabel]);

  // Update visual selection without re-creating the scene
  useEffect(() => {
    updateSelectionRef.current?.(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = zoomLevel.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Globe wireframe
    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xdddddd, wireframe: true, transparent: true, opacity: 0.08 })
    );

    // Circle outline
    const circleMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.99, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
    );

    // Dots with vertex colours for per-dot selection highlighting
    const dotGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(dotPositions.length * 3);
    const colArr = new Float32Array(dotPositions.length * 3);
    dotPositions.forEach((v, i) => {
      posArr[i * 3] = v.x; posArr[i * 3 + 1] = v.y; posArr[i * 3 + 2] = v.z;
      colArr[i * 3] = 0.13; colArr[i * 3 + 1] = 0.13; colArr[i * 3 + 2] = 0.13;
    });
    dotGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const colorAttr = new THREE.BufferAttribute(colArr, 3);
    dotGeo.setAttribute("color", colorAttr);
    const dotMat = new THREE.PointsMaterial({ vertexColors: true, size: 0.015, sizeAttenuation: true });
    const dotCloud = new THREE.Points(dotGeo, dotMat);

    // Thread lines
    const threadLines: THREE.Line[] = [];
    const threadMeta: { indexA: number; indexB: number }[] = [];

    for (const [iA, iB] of threads) {
      const a = dotPositions[iA];
      const b = dotPositions[iB];
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(1.08);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),
        new THREE.LineBasicMaterial({ color: DEFAULT_THREAD, transparent: true, opacity: 0.15 })
      );
      threadLines.push(line);
      threadMeta.push({ indexA: iA, indexB: iB });
    }

    const group = new THREE.Group();
    group.add(globeMesh, circleMesh, dotCloud, ...threadLines);
    scene.add(group);

    // Selection updater — called when selectedLabel changes without re-mounting the scene
    const applySelection = (label: string | null | undefined) => {
      threadLines.forEach((line, i) => {
        const { indexA, indexB } = threadMeta[i];
        const isSelected = !!label && (points[indexA]?.label === label || points[indexB]?.label === label);
        const mat = line.material as THREE.LineBasicMaterial;
        mat.color.setHex(isSelected ? SELECTED_THREAD : DEFAULT_THREAD);
        mat.opacity = isSelected ? 0.5 : 0.15;
        mat.needsUpdate = true;
      });
      dotPositions.forEach((_, i) => {
        const isSelected = !!label && points[i]?.label === label;
        const v = isSelected ? 0.05 : 0.13;
        colorAttr.setXYZ(i, v, v, v);
      });
      colorAttr.needsUpdate = true;
    };
    updateSelectionRef.current = applySelection;
    applySelection(selectedLabelRef.current); // apply immediately on scene creation

    // Raycaster
    const raycaster = new THREE.Raycaster();
    (raycaster.params as any).Line = { threshold: 0.05 };
    (raycaster.params as any).Points = { threshold: 0.05 };
    const mouse = new THREE.Vector2();
    let hoveredLine: THREE.Line | null = null;

    const getMouseNDC = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    let animating = true;
    const animate = () => {
      if (!animating) return;
      if (!isDragging.current) rotation.current.y += 0.002;
      group.rotation.x = rotation.current.x;
      group.rotation.y = rotation.current.y;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      didDrag.current = false;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - prevMouse.current.x;
        const dy = e.clientY - prevMouse.current.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDrag.current = true;
        rotation.current.y += dx * 0.005;
        rotation.current.x += dy * 0.005;
        prevMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(threadLines);

      if (hoveredLine && hoveredLine !== intersects[0]?.object) {
        const idx = threadLines.indexOf(hoveredLine);
        const cur = selectedLabelRef.current;
        const isSelected = !!cur && (points[threadMeta[idx]?.indexA]?.label === cur || points[threadMeta[idx]?.indexB]?.label === cur);
        const mat = hoveredLine.material as THREE.LineBasicMaterial;
        mat.color.setHex(isSelected ? SELECTED_THREAD : DEFAULT_THREAD);
        mat.opacity = isSelected ? 0.5 : 0.15;
        hoveredLine = null;
      }

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Line;
        (hit.material as THREE.LineBasicMaterial).color.setHex(HOVER_THREAD);
        (hit.material as THREE.LineBasicMaterial).opacity = 0.5;
        hoveredLine = hit;
        container.style.cursor = "pointer";
      } else {
        container.style.cursor = "grab";
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasDrag = didDrag.current;
      isDragging.current = false;
      didDrag.current = false;
      if (wasDrag) return;

      getMouseNDC(e);
      raycaster.setFromCamera(mouse, camera);

      // Thread click
      const threadHits = raycaster.intersectObjects(threadLines);
      if (threadHits.length > 0 && onThreadClick) {
        const idx = threadLines.indexOf(threadHits[0].object as THREE.Line);
        if (idx >= 0) {
          const { indexA, indexB } = threadMeta[idx];
          const labelA = points[indexA]?.label;
          const labelB = points[indexB]?.label;
          if (labelA && labelB) onThreadClick(labelA, labelB);
          return;
        }
      }

      // Dot click
      if (onDotClick) {
        const dotHits = raycaster.intersectObject(dotCloud);
        if (dotHits.length > 0 && dotHits[0].index !== undefined) {
          const label = points[dotHits[0].index]?.label;
          if (label) onDotClick(label);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomLevel.current = Math.max(1.8, Math.min(6, zoomLevel.current + e.deltaY * 0.003));
      camera.position.z = zoomLevel.current;
    };

    let lastTouchDist = 0;
    const getTouchDist = (e: TouchEvent) => Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastTouchDist = getTouchDist(e);
      } else if (e.touches.length === 1) {
        isDragging.current = true;
        didDrag.current = false;
        prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e);
        zoomLevel.current = Math.max(1.8, Math.min(6, zoomLevel.current + (lastTouchDist - dist) * 0.01));
        camera.position.z = zoomLevel.current;
        lastTouchDist = dist;
      } else if (e.touches.length === 1 && isDragging.current) {
        const dx = e.touches[0].clientX - prevMouse.current.x;
        const dy = e.touches[0].clientY - prevMouse.current.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDrag.current = true;
        rotation.current.y += dx * 0.005;
        rotation.current.x += dy * 0.005;
        prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => { isDragging.current = false; lastTouchDist = 0; };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      animating = false;
      updateSelectionRef.current = null;
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [dotPositions, threads, points, onThreadClick, onDotClick]);
  // selectedLabel intentionally excluded from deps — handled via updateSelectionRef

  return <div ref={containerRef} className="w-full h-full" />;
};

export default Globe;
