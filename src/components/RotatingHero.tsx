import { useState, useEffect, useRef } from "react";
import { fetchTextileObjectIds, fetchObject } from "@/lib/metApi";

const FADE_MS = 1200;
const INTERVAL_MS = 9000;
const POOL_SIZE = 20;

function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

const RotatingHero = () => {
  const [srcs, setSrcs] = useState<[string, string]>(["", ""]);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [ready, setReady] = useState(false);

  const activeRef = useRef<0 | 1>(0);
  const srcsRef = useRef<[string, string]>(["", ""]);
  const poolRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const busyRef = useRef(false);

  const setSrcsSync = (next: [string, string]) => {
    srcsRef.current = next;
    setSrcs(next);
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    async function init() {
      const ids = await fetchTextileObjectIds();
      if (cancelled) return;

      // Random starting offset for variety
      const offset = Math.floor(Math.random() * ids.length);
      const shuffled = [...ids.slice(offset), ...ids.slice(0, offset)];

      // Build a pool of valid image URLs
      const pool: string[] = [];
      let i = 0;
      while (pool.length < POOL_SIZE && i < shuffled.length) {
        const obj = await fetchObject(shuffled[i++]);
        if (cancelled) return;
        if (obj?.primaryImage) pool.push(obj.primaryImage);
      }
      if (pool.length === 0) return;

      poolRef.current = pool;
      idxRef.current = 0;

      // Load first image into slot 0
      const first = pool[0];
      await preload(first);
      if (cancelled) return;
      idxRef.current = 1;
      setSrcsSync([first, ""]);
      setReady(true);

      // Pre-load second image into hidden slot
      const second = pool[1 % pool.length];
      await preload(second);
      if (cancelled) return;
      setSrcsSync([first, second]);
      idxRef.current = 2;

      timer = setInterval(async () => {
        if (busyRef.current) return;
        busyRef.current = true;

        const nextSlot = activeRef.current === 0 ? 1 : 0;

        // Swap
        activeRef.current = nextSlot;
        setActiveSlot(nextSlot);

        // After fade completes, load next image into the now-hidden slot
        await new Promise((r) => setTimeout(r, FADE_MS + 200));

        const hiddenSlot = nextSlot === 0 ? 1 : 0;
        const nextSrc = poolRef.current[idxRef.current % poolRef.current.length];
        idxRef.current++;
        await preload(nextSrc);
        if (cancelled) { busyRef.current = false; return; }

        const next: [string, string] = [...srcsRef.current] as [string, string];
        next[hiddenSlot] = nextSrc;
        setSrcsSync(next);

        busyRef.current = false;
      }, INTERVAL_MS);
    }

    init();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="relative w-full h-[40vh] md:h-[52vh] overflow-hidden mb-10">
      {([0, 1] as const).map((slot) => (
        <img
          key={slot}
          src={srcs[slot]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: activeSlot === slot ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
    </div>
  );
};

export default RotatingHero;
