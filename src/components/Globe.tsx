import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

interface GlobeProps {
  points: { lat: number; lng: number }[];
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

const Globe = ({ points }: GlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: 0 });

  const dotPositions = useMemo(() => {
    return points.map((p) => latLngToVector3(p.lat, p.lng, 1));
  }, [points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Globe wireframe
    const globeGeo = new THREE.SphereGeometry(1, 48, 48);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Circle outline
    const circleGeo = new THREE.RingGeometry(0.99, 1.0, 64);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    scene.add(circle);

    // Dots
    const dotGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dotPositions.length * 3);
    dotPositions.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0x222222,
      size: 0.015,
      sizeAttenuation: true,
    });
    const dotCloud = new THREE.Points(dotGeo, dotMat);
    scene.add(dotCloud);

    const group = new THREE.Group();
    group.add(globe, circle, dotCloud);
    scene.add(group);

    const animate = () => {
      if (!isDragging.current) {
        rotation.current.y += 0.002;
      }
      group.rotation.x = rotation.current.x;
      group.rotation.y = rotation.current.y;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      rotation.current.y += dx * 0.005;
      rotation.current.x += dy * 0.005;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [dotPositions]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default Globe;
