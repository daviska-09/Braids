import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bold, Italic, Link2, ArrowUp, ArrowDown } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TextSize = "small" | "normal" | "large" | "heading";

interface EmbedItem { url: string; html: string }
interface TextBlock { html: string; href?: string }
interface SectionMedia { images: string[]; embeds: EmbedItem[]; textBlocks: TextBlock[] }
interface ProjectContent { id: string; title: string; body: string }
interface EducationItem { school: string; degree: string }
interface PageContent {
  about: string;
  projects: ProjectContent[];
  education: EducationItem[];
  media: Record<string, SectionMedia>;
  sizes: Record<string, TextSize>;
}

// ─── Dollhouse room positions (index-matched to draft.projects) ─────────────────

const ROOM_POSITIONS = [
  { x: "3%",  y: "3%",  w: "46%", h: "26%" },
  { x: "50%", y: "3%",  w: "47%", h: "26%" },
  { x: "3%",  y: "26%", w: "46%", h: "26%" },
  { x: "50%", y: "26%", w: "47%", h: "26%" },
  { x: "3%",  y: "51%", w: "46%", h: "18%" },
  { x: "50%", y: "51%", w: "47%", h: "18%" },
];

// ─── Constants ─────────────────────────────────────────────────────────────────

const LS_CONTENT = "katelyn_page_content";
const SS_AUTH    = "katelyn_admin_auth";

const SIZE_CLASS: Record<TextSize, string> = {
  small:   "text-xs",
  normal:  "text-sm",
  large:   "text-base md:text-lg",
  heading: "font-serif text-xl md:text-2xl",
};

function stripHtml(html: string): string {
  const stripped = html.replace(/<[^>]+>/g, "").trim();
  const el = document.createElement("div");
  el.innerHTML = stripped;
  return el.textContent ?? el.innerText ?? stripped;
}

type DhT = { scale: number; x: number; y: number };

function clampDh(t: DhT, W: number, H: number): DhT {
  if (t.scale <= 1) return { scale: t.scale, x: 0, y: 0 };
  return {
    scale: t.scale,
    x: Math.min(0, Math.max(W * (1 - t.scale), t.x)),
    y: Math.min(0, Math.max(H * (1 - t.scale), t.y)),
  };
}

// ─── Default content ───────────────────────────────────────────────────────────

function toHtml(text: string) {
  return text.split("\n").map(l => `<p>${l}</p>`).join("");
}

const DEFAULT_ABOUT =
  `at my core i'm interested in helping take the knowledge of the past into future resilience ` +
  `practices and projects that positively impact our world. a historian by degree, marketer by ` +
  `trade, i've explored frontiers throughout human history and often move fast and with a small ` +
  `team through the 21st century. i've built my interests and career around people and focus on ` +
  `the power of what we can surmount through creativity, resilience and good communication. i care ` +
  `deeply about how we create culture, craft, language, our natural world and the way technology ` +
  `can either preserve things or erase them (and the governance questions that sit at the ` +
  `intersection of it all).`;

const RAW_PROJECTS = [
  { id: "lace", title: "lace & textile research", body:
    "— working with irish lace archives in ireland and new york\n— lace and textile archive project with the guild of irish lacemakers\n" +
    "— antonio ratti textile centre research visit, met museum, new york\n— archives of the fashion institute of technology research visit, new york" },
  { id: "editorial", title: "editorial & communications", body:
    "— executive editor, echoes east-galway historical journal (2021–present)\n— colonial legacies research project, trinity college dublin\n" +
    "— food and drink editor, trinity news (2022/23)\n— editor, iscg review, irish student consulting group (2021/22)\n" +
    "— publishing and marketing intern, the nenagh guardian (2022)\n— published poetry in icarus and the attic\n— all publications designed using adobe suite" },
  { id: "formula-trinity", title: "formula trinity", body:
    "head of operations & marketing 2023/24\nai business and operations lead 2022/23\ngraphics and marketing officer 2021/22\n" +
    "— created content that grew social following from 1.3k to 33k in 12 months\n— 6m+ views across platforms\n" +
    "— raised €30k in sponsorship for 2024 season\n— won inaugural aston martin x racing pride d&i award 2022\n" +
    "— only irish car to pass scrutineering at fsuk 2024\n— interviewed aston martin f1 team on diversity and inclusion in motorsport" },
  { id: "historical", title: "historical & community projects", body:
    "— craicathon: ireland's first irish language hackathon (dogpatch labs, 2026)\n— patch inaugural unconference (2025)\n" +
    "— catalogues of imagination: 4voice eu history of democracy project, funded by the european union (2025)\n" +
    "— eci 4 water initiative (2025): building a water-smart and resilient europe\n" +
    "— eu green transition workshop with rethink ireland (2024): designed and delivered as part of the eu social ecosystems for fair and inclusive transitions fund\n" +
    "— echoes community historical journal, editor (2021–present)" },
  { id: "vapebox", title: "vapebox", body:
    "co-founder, green tech social enterprise\n— 1st place enactus ireland 2023\n— final 16 at enactus world cup, utrecht 2023\n" +
    "— official vape recycling partner: weee ireland, hale vapes, electric picnic\n— recycled 2,000+ vapes at electric picnic 2023\n" +
    "— pilot programme agreement valued at €20k\n— presented at dáil éireann with irish green party tds" },
  { id: "reel-museum", title: "reel museum (current)", body:
    "independent producer and creative technologist.\n" +
    "building reel museum — a museum without walls, celebrating 5,000 years of textiles and human craftsmanship across global collections.\n" +
    "currently at: reelmuseum.com" },
];

function makeDefault(): PageContent {
  return {
    about: DEFAULT_ABOUT,
    projects: RAW_PROJECTS.map(p => ({ ...p, body: toHtml(p.body) })),
    education: [
      { school: "london school of economics", degree: "msc media and communications (governance), starting september 2026" },
      { school: "trinity college dublin", degree: "ba history and english" },
    ],
    media: {},
    sizes: {},
  };
}

// ─── Storage ───────────────────────────────────────────────────────────────────

function loadContent(): PageContent {
  try {
    const raw = localStorage.getItem(LS_CONTENT);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PageContent>;
      const d = makeDefault();
      return {
        about:     p.about     ?? d.about,
        projects:  p.projects  ?? d.projects,
        education: p.education ?? d.education,
        media:     p.media     ?? {},
        sizes:     p.sizes     ?? {},
      };
    }
  } catch {}
  return makeDefault();
}

function persistContent(c: PageContent) {
  localStorage.setItem(LS_CONTENT, JSON.stringify(c));
}

// ─── EditableBlock ─────────────────────────────────────────────────────────────

function EditableBlock({
  html, onHtmlChange, isEditing, className = "", onFocused,
}: {
  html: string;
  onHtmlChange: (html: string) => void;
  isEditing: boolean;
  className?: string;
  onFocused?: (el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => { if (ref.current) ref.current.innerHTML = html; }, []); // eslint-disable-line
  useEffect(() => {
    if (ref.current && !focused.current) ref.current.innerHTML = html;
  }, [html]);

  return (
    <div
      ref={ref}
      contentEditable={isEditing || undefined}
      suppressContentEditableWarning
      onFocus={() => { focused.current = true; if (onFocused && ref.current) onFocused(ref.current); }}
      onBlur={() => { focused.current = false; if (ref.current) onHtmlChange(ref.current.innerHTML); }}
      onInput={() => { if (ref.current) onHtmlChange(ref.current.innerHTML); }}
      className={`${className}${isEditing ? " cursor-text focus:outline-none focus:ring-1 focus:ring-accent/40 focus:rounded-sm" : ""}`}
    />
  );
}

// ─── FloatingToolbar ───────────────────────────────────────────────────────────

function FloatingToolbar({ anchor, size, onSizeChange }: {
  anchor: HTMLElement | null;
  size: TextSize;
  onSizeChange: (s: TextSize) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchor) return;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.top - 48, left: Math.max(8, r.left) });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [anchor]);

  if (!anchor) return null;

  const prevent = (e: React.MouseEvent) => e.preventDefault();
  const cmd = (command: string, value?: string) => { document.execCommand(command, false, value); anchor.focus(); };
  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = window.prompt("url:");
    if (url) cmd("createLink", url);
  };

  return (
    <div
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 500 }}
      className="hidden md:flex items-center gap-0.5 bg-background border border-border rounded-md shadow-lg px-2 py-1.5 text-xs"
      onMouseDown={prevent}
    >
      {(["small", "normal", "large", "heading"] as TextSize[]).map(s => (
        <button key={s} onMouseDown={e => { prevent(e); onSizeChange(s); }}
          className={`px-1.5 py-0.5 rounded transition-colors ${size === s ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
          {s === "small" ? "S" : s === "normal" ? "M" : s === "large" ? "L" : "H"}
        </button>
      ))}
      <div className="w-px h-4 bg-border mx-1" />
      <button onMouseDown={e => { prevent(e); cmd("bold"); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Bold className="w-3 h-3" /></button>
      <button onMouseDown={e => { prevent(e); cmd("italic"); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Italic className="w-3 h-3" /></button>
      <button onMouseDown={handleLink} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Link2 className="w-3 h-3" /></button>
    </div>
  );
}

// ─── oEmbed ────────────────────────────────────────────────────────────────────

async function fetchOEmbed(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.html as string;
  } catch { return null; }
}

// ─── Main component ────────────────────────────────────────────────────────────

const Katelyn = () => {
  const [isAuth,      setIsAuth]      = useState(() => sessionStorage.getItem(SS_AUTH) === "true");
  const [saved,       setSaved]       = useState<PageContent>(loadContent);
  const [draft,       setDraft]       = useState<PageContent>(loadContent);
  const [activeRoom,  setActiveRoom]  = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [activeEl,    setActiveEl]    = useState<HTMLElement | null>(null);
  const [activeKey,   setActiveKey]   = useState("");
  const [embedInputs,  setEmbedInputs]  = useState<Record<string, string>>({});
  const [embedLoading, setEmbedLoading] = useState<string | null>(null);

  // Dollhouse zoom / pan
  const [dhTransform, setDhTransform]     = useState<DhT>({ scale: 1, x: 0, y: 0 });
  const [dhTransitioning, setDhTransitioning] = useState(false);
  const dhTransformRef = useRef<DhT>({ scale: 1, x: 0, y: 0 });
  const dhContainerRef = useRef<HTMLDivElement>(null);
  const dhDragRef      = useRef({ active: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const dhPinchRef     = useRef({ active: false, startDist: 1, origScale: 1, midX: 0, midY: 0, origX: 0, origY: 0 });

  const footerClicks = useRef(0);
  const footerTimer  = useRef<ReturnType<typeof setTimeout>>();

  const hasUnsaved    = JSON.stringify(draft) !== JSON.stringify(saved);
  const activeProject = activeRoom ? (draft.projects.find(p => p.id === activeRoom) ?? null) : null;
  const pId           = activeRoom ?? "";
  const media         = draft.media[pId];

  const zoomToRoom = (i: number) => {
    const pos = ROOM_POSITIONS[i];
    const el  = dhContainerRef.current;
    if (!pos || !el) return;
    const W   = el.clientWidth;
    const img = el.querySelector("img") as HTMLImageElement | null;
    const H   = img?.clientHeight ?? W;
    const fx  = parseFloat(pos.x) / 100 + parseFloat(pos.w) / 200;
    const fy  = parseFloat(pos.y) / 100 + parseFloat(pos.h) / 200;
    const S   = 2.5;
    const next = clampDh({ scale: S, x: W / 2 - fx * W * S, y: H / 2 - fy * H * S }, W, H);
    dhTransformRef.current = next;
    setDhTransitioning(true);
    setDhTransform(next);
  };

  const closeModal = useCallback(() => {
    setActiveRoom(null);
    setActiveEl(null);
    const reset: DhT = { scale: 1, x: 0, y: 0 };
    dhTransformRef.current = reset;
    setDhTransitioning(true);
    setDhTransform(reset);
  }, []);

  // Keep transform ref current
  useEffect(() => { dhTransformRef.current = dhTransform; }, [dhTransform]);

  // Native wheel + touch listeners (need passive:false)
  useEffect(() => {
    const el = dhContainerRef.current;
    if (!el) return;

    const getDims = () => {
      const W = el.clientWidth;
      const img = el.querySelector("img") as HTMLImageElement | null;
      return { W, H: img?.clientHeight ?? W };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const prev = dhTransformRef.current;
      const { W, H } = getDims();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setDhTransitioning(false);
      const f = e.deltaY > 0 ? 0.9 : 1.1;
      const s = Math.min(4, Math.max(1, prev.scale * f));
      const px = (cx - prev.x) / prev.scale;
      const py = (cy - prev.y) / prev.scale;
      const next = clampDh({ scale: s, x: cx - px * s, y: cy - py * s }, W, H);
      dhTransformRef.current = next;
      setDhTransform(next);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (dhTransformRef.current.scale <= 1) return;
      const cur = dhTransformRef.current;
      dhDragRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, origX: cur.x, origY: cur.y };
      setDhTransitioning(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dhDragRef.current.active) return;
      const dx = e.clientX - dhDragRef.current.startX;
      const dy = e.clientY - dhDragRef.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dhDragRef.current.moved = true;
      const { W, H } = getDims();
      const next = clampDh({ scale: dhTransformRef.current.scale, x: dhDragRef.current.origX + dx, y: dhDragRef.current.origY + dy }, W, H);
      dhTransformRef.current = next;
      setDhTransform(next);
    };

    const onMouseUp = () => { dhDragRef.current.active = false; };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const rect = el.getBoundingClientRect();
        const cur = dhTransformRef.current;
        dhPinchRef.current = {
          active: true,
          startDist: Math.hypot(dx, dy) || 1,
          origScale: cur.scale,
          midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          origX: cur.x,
          origY: cur.y,
        };
        setDhTransitioning(false);
      } else if (e.touches.length === 1 && dhTransformRef.current.scale > 1) {
        const cur = dhTransformRef.current;
        dhDragRef.current = { active: true, moved: false, startX: e.touches[0].clientX, startY: e.touches[0].clientY, origX: cur.x, origY: cur.y };
        setDhTransitioning(false);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const { W, H } = getDims();
      if (dhPinchRef.current.active && e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const { startDist, origScale, midX, midY, origX, origY } = dhPinchRef.current;
        const s = Math.min(4, Math.max(1, origScale * (Math.hypot(dx, dy) / startDist)));
        const px = (midX - origX) / origScale;
        const py = (midY - origY) / origScale;
        const next = clampDh({ scale: s, x: midX - px * s, y: midY - py * s }, W, H);
        dhTransformRef.current = next;
        setDhTransform(next);
      } else if (dhDragRef.current.active && e.touches.length === 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dhDragRef.current.startX;
        const dy = e.touches[0].clientY - dhDragRef.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) dhDragRef.current.moved = true;
        const next = clampDh({ scale: dhTransformRef.current.scale, x: dhDragRef.current.origX + dx, y: dhDragRef.current.origY + dy }, W, H);
        dhTransformRef.current = next;
        setDhTransform(next);
      }
    };

    const onTouchEnd = () => { dhPinchRef.current.active = false; dhDragRef.current.active = false; };

    el.addEventListener("wheel",      onWheel,      { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);
    el.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);

    return () => {
      el.removeEventListener("wheel",      onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!activeRoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeRoom, closeModal]);

  useEffect(() => {
    const hasEmbeds = Object.values(draft.media).some(m => m.embeds.length > 0);
    if (!hasEmbeds) return;
    if (document.getElementById("twitter-wjs")) { (window as any).twttr?.widgets?.load(); return; }
    const s = document.createElement("script");
    s.id = "twitter-wjs"; s.src = "https://platform.twitter.com/widgets.js"; s.async = true;
    document.head.appendChild(s);
  }, [draft.media]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

  const handleFooterClick = () => {
    footerClicks.current += 1;
    clearTimeout(footerTimer.current);
    if (footerClicks.current >= 3) {
      footerClicks.current = 0;
      const pwd = window.prompt("password:");
      if (pwd !== null) {
        const expected = import.meta.env.VITE_KATELYN_ADMIN_PASSWORD ?? "reel2024";
        if (pwd === expected) { sessionStorage.setItem(SS_AUTH, "true"); setIsAuth(true); }
      }
    } else {
      footerTimer.current = setTimeout(() => { footerClicks.current = 0; }, 600);
    }
  };

  const logout = () => { sessionStorage.removeItem(SS_AUTH); setIsAuth(false); setActiveEl(null); };

  // ── Save / cancel ─────────────────────────────────────────────────────────────

  const handleSave   = () => { persistContent(draft); setSaved(draft); };
  const handleCancel = () => { (document.activeElement as HTMLElement)?.blur(); setDraft(saved); setActiveEl(null); };

  // ── Content setters ───────────────────────────────────────────────────────────

  const setAbout = (html: string) => setDraft(p => ({ ...p, about: html }));
  const setProjectTitle = (id: string, html: string) =>
    setDraft(p => ({ ...p, projects: p.projects.map(pr => pr.id === id ? { ...pr, title: html } : pr) }));
  const setProjectBody = (id: string, html: string) =>
    setDraft(p => ({ ...p, projects: p.projects.map(pr => pr.id === id ? { ...pr, body: html } : pr) }));
  const setEduField = (idx: number, field: "school" | "degree", html: string) =>
    setDraft(p => ({ ...p, education: p.education.map((e, i) => i === idx ? { ...e, [field]: html } : e) }));
  const setSize = (key: string, size: TextSize) =>
    setDraft(p => ({ ...p, sizes: { ...p.sizes, [key]: size } }));

  // ── Project order / add / remove ──────────────────────────────────────────────

  const moveProject = (id: string, dir: "up" | "down") =>
    setDraft(p => {
      const arr = [...p.projects];
      const i = arr.findIndex(pr => pr.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, projects: arr };
    });

  const removeProject = (id: string) =>
    setDraft(p => ({ ...p, projects: p.projects.filter(pr => pr.id !== id) }));

  const addProject = () =>
    setDraft(p => ({
      ...p,
      projects: [...p.projects, { id: `project-${Date.now()}`, title: "new section", body: "" }],
    }));

  // ── Media ─────────────────────────────────────────────────────────────────────

  const addImage = (projectId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
        images: [...(p.media[projectId]?.images ?? []), b64],
        embeds: p.media[projectId]?.embeds ?? [],
        textBlocks: p.media[projectId]?.textBlocks ?? [],
      }}}));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (projectId: string, idx: number) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      ...p.media[projectId],
      images: (p.media[projectId]?.images ?? []).filter((_, i) => i !== idx),
    }}}));

  const handleEmbed = async (projectId: string) => {
    const url = embedInputs[projectId]?.trim();
    if (!url) return;
    setEmbedLoading(projectId);
    const html = await fetchOEmbed(url);
    setEmbedLoading(null);
    if (html) {
      setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
        images: p.media[projectId]?.images ?? [],
        embeds: [...(p.media[projectId]?.embeds ?? []), { url, html }],
        textBlocks: p.media[projectId]?.textBlocks ?? [],
      }}}));
      setEmbedInputs(e => ({ ...e, [projectId]: "" }));
    }
  };

  const removeEmbed = (projectId: string, idx: number) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      ...p.media[projectId],
      embeds: (p.media[projectId]?.embeds ?? []).filter((_, i) => i !== idx),
    }}}));

  const addTextBlock = (projectId: string) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      images: p.media[projectId]?.images ?? [],
      embeds: p.media[projectId]?.embeds ?? [],
      textBlocks: [...(p.media[projectId]?.textBlocks ?? []), { html: "" }],
    }}}));

  const updateTextBlock = (projectId: string, idx: number, html: string) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      ...p.media[projectId],
      textBlocks: (p.media[projectId]?.textBlocks ?? []).map((t, i) => i === idx ? { ...t, html } : t),
    }}}));

  const updateTextBlockHref = (projectId: string, idx: number, href: string) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      ...p.media[projectId],
      textBlocks: (p.media[projectId]?.textBlocks ?? []).map((t, i) => i === idx ? { ...t, href: href || undefined } : t),
    }}}));

  const removeTextBlock = (projectId: string, idx: number) =>
    setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
      ...p.media[projectId],
      textBlocks: (p.media[projectId]?.textBlocks ?? []).filter((_, i) => i !== idx),
    }}}));

  // ── Toolbar ───────────────────────────────────────────────────────────────────

  const focusBlock    = (key: string) => (el: HTMLElement) => { setActiveEl(el); setActiveKey(key); };
  const currentSize: TextSize = (draft.sizes[activeKey] as TextSize) ?? (activeKey === "about" ? "large" : "normal");

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 md:px-10 pb-24">

      {/* Edit mode indicator */}
      {isAuth && (
        <div className="fixed top-16 right-4 z-[400] flex items-center gap-3 text-xs">
          <span className="px-2 py-1 bg-muted rounded text-muted-foreground">editing</span>
          <button onClick={logout} className="text-muted-foreground hover:text-foreground transition-colors">log out</button>
        </div>
      )}

      {/* Floating toolbar */}
      {isAuth && (
        <FloatingToolbar
          anchor={activeEl}
          size={currentSize}
          onSizeChange={s => { setSize(activeKey, s); if (activeEl) activeEl.focus(); }}
        />
      )}

      {/* Header */}
      <div className="mt-2 mb-10 max-w-2xl">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">katelyn davis</h1>
        <p className="font-serif text-lg text-foreground/60 mb-4">marketer. designer. researcher. builder.</p>
        <p className="text-sm text-muted-foreground mb-3">born in galway, building in dublin</p>
        <div className="flex items-center gap-4 text-sm">
          <a href="https://linkedin.com/in/katelyn-davis" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">linkedin</a>
          <a href="https://kat3lyn.substack.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">substack</a>
          <a href="mailto:katelynemdavis@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors">mail</a>
        </div>
      </div>

      {/* Dollhouse + Sidebar */}
      <div className="mb-12 mx-auto max-w-[1000px]">

        {/* Mobile: horizontal scroll list */}
        <div className="md:hidden mb-4 overflow-x-auto flex gap-6 pb-1">
          {draft.projects.map(project => (
            <button key={project.id} onClick={() => setActiveRoom(project.id)}
              className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0 transition-colors">
              {stripHtml(project.title)}
            </button>
          ))}
        </div>

        <div className="flex items-start">
          {/* Dollhouse */}
          <div
            ref={dhContainerRef}
            className="flex-1 relative select-none min-w-0 overflow-hidden"
            style={{ cursor: dhTransform.scale > 1 ? "grab" : "default" }}
          >
            <div
              style={{
                transform: `translate(${dhTransform.x}px, ${dhTransform.y}px) scale(${dhTransform.scale})`,
                transformOrigin: "0 0",
                transition: dhTransitioning ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                willChange: "transform",
              }}
            >
              <img
                src="/dollhouse.png"
                alt="Petronella de la Court's dolls' house, c.1670"
                className="w-full block"
                style={{ mixBlendMode: "multiply" }}
                draggable={false}
              />
              {draft.projects.map((project, i) => {
                const pos = ROOM_POSITIONS[i];
                if (!pos) return null;
                const isHovered = hoveredRoom === project.id;
                return (
                  <div
                    key={project.id}
                    onMouseEnter={() => setHoveredRoom(project.id)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    onClick={() => {
                      if (dhDragRef.current.moved) { dhDragRef.current.moved = false; return; }
                      zoomToRoom(i);
                      setActiveRoom(project.id);
                    }}
                    style={{ position: "absolute", left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
                    className="cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 transition-opacity duration-200"
                      style={{ background: "rgba(255, 248, 230, 0.35)", opacity: isHovered ? 1 : 0 }}
                    />
                    <div
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-200"
                      style={{ opacity: isHovered ? 1 : 0 }}
                    >
                      <span
                        className="text-sm lowercase whitespace-nowrap px-3 py-1 rounded-full"
                        style={{ background: "rgba(30, 22, 12, 0.7)", color: "rgba(255, 248, 230, 0.95)" }}
                      >
                        {stripHtml(project.title)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar — desktop only */}
          <div className="hidden md:flex items-stretch flex-shrink-0 ml-6 self-stretch">
            <div className="w-px bg-border mr-6" />
            <nav className="w-44 pt-1 flex flex-col gap-0.5">
              {draft.projects.map((project, i) => {
                const hasRoom  = i < ROOM_POSITIONS.length;
                const isHovered = hoveredRoom === project.id;
                return (
                  <div key={project.id} className="group/row flex items-center justify-between">
                    <button
                      onMouseEnter={() => hasRoom && setHoveredRoom(project.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      onClick={() => setActiveRoom(project.id)}
                      className={`text-left text-xs py-1.5 transition-colors flex-1 min-w-0 truncate ${
                        isHovered ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      } ${!hasRoom && isAuth ? "opacity-50" : ""}`}
                    >
                      {stripHtml(project.title) || "untitled"}
                    </button>
                    {isAuth && (
                      <div className="flex items-center opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0 ml-1">
                        <button onClick={() => moveProject(project.id, "up")} disabled={i === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => moveProject(project.id, "down")} disabled={i === draft.projects.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => removeProject(project.id)}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {isAuth && (
                <button onClick={addProject}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-left py-1">
                  + add section
                </button>
              )}
            </nav>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground/70 text-center italic">
          petronella de la court's dolls' house, c.1670. centraal museum, utrecht. click a room to explore.
        </p>
      </div>

      {/* About */}
      <div className="mb-12 max-w-2xl">
        <EditableBlock
          html={draft.about}
          onHtmlChange={setAbout}
          isEditing={isAuth}
          className={`font-serif leading-relaxed text-foreground/80 ${SIZE_CLASS[(draft.sizes["about"] as TextSize) ?? "large"]}`}
          onFocused={focusBlock("about")}
        />
      </div>

      {/* Education */}
      <div className="mb-12 max-w-2xl">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-4">education</h2>
        <div className="space-y-4">
          {draft.education.map((e, i) => (
            <div key={i}>
              <EditableBlock
                html={e.school}
                onHtmlChange={h => setEduField(i, "school", h)}
                isEditing={isAuth}
                className={`font-serif text-foreground ${SIZE_CLASS[(draft.sizes[`edu-school-${i}`] as TextSize) ?? "normal"]}`}
                onFocused={focusBlock(`edu-school-${i}`)}
              />
              <EditableBlock
                html={e.degree}
                onHtmlChange={h => setEduField(i, "degree", h)}
                isEditing={isAuth}
                className={`text-muted-foreground mt-0.5 ${SIZE_CLASS[(draft.sizes[`edu-degree-${i}`] as TextSize) ?? "small"]}`}
                onFocused={focusBlock(`edu-degree-${i}`)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-6 max-w-2xl">
        <p
          className="text-xs text-muted-foreground leading-relaxed cursor-default select-none"
          onClick={handleFooterClick}
        >
          this page is not linked from the main site. if you have it, please share me responsibly.
        </p>
        <a href="https://reelmuseum.com" target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 group w-fit">
          <img src="/favicon.png" alt="Reel Museum" className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs text-foreground/70 group-hover:text-foreground transition-colors">reelmuseum.com</span>
        </a>
      </div>

      {/* Save bar */}
      {isAuth && hasUnsaved && (
        <div className="fixed bottom-0 left-0 right-0 z-[400] flex items-center justify-center gap-4 py-3 px-4 bg-background/95 border-t border-border backdrop-blur-sm">
          <span className="text-xs text-muted-foreground">unsaved changes</span>
          <button onClick={handleSave} className="text-xs px-3 py-1.5 bg-foreground text-background rounded hover:opacity-90 transition-opacity">save changes</button>
          <button onClick={handleCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">cancel</button>
        </div>
      )}

      {/* Project modal */}
      <AnimatePresence>
        {activeProject && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              className="relative z-10 bg-background w-full md:w-[60vw] max-h-[75vh] overflow-y-auto"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={closeModal} className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>

              <div className="p-8 pt-12">
                {/* Title */}
                <div className="flex items-center gap-2 mb-5">
                  {pId === "reel-museum" && (
                    <img src="/favicon.png" alt="" className="w-4 h-4 opacity-70 flex-shrink-0" />
                  )}
                  {isAuth ? (
                    <EditableBlock
                      html={activeProject.title}
                      onHtmlChange={h => setProjectTitle(activeProject.id, h)}
                      isEditing
                      className="font-serif text-xl text-foreground flex-1"
                      onFocused={focusBlock(`title-${activeProject.id}`)}
                    />
                  ) : (
                    <h2 className="font-serif text-xl text-foreground" dangerouslySetInnerHTML={{ __html: activeProject.title }} />
                  )}
                </div>

                {/* Body */}
                <EditableBlock
                  html={activeProject.body}
                  onHtmlChange={h => setProjectBody(activeProject.id, h)}
                  isEditing={isAuth}
                  className={`text-foreground/70 leading-relaxed [&_p]:mb-1.5 ${SIZE_CLASS[(draft.sizes[`body-${activeProject.id}`] as TextSize) ?? "normal"]}`}
                  onFocused={focusBlock(`body-${activeProject.id}`)}
                />

                {/* Extra text blocks */}
                {(media?.textBlocks ?? []).map((tb, i) => (
                  <div key={i} className="relative mt-4">
                    {tb.href && !isAuth ? (
                      <a href={tb.href} target="_blank" rel="noopener noreferrer"
                        className={`block text-foreground/70 leading-relaxed [&_p]:mb-1 hover:text-foreground transition-colors underline underline-offset-2 ${SIZE_CLASS[(draft.sizes[`tb-${pId}-${i}`] as TextSize) ?? "normal"]}`}
                        dangerouslySetInnerHTML={{ __html: tb.html }}
                      />
                    ) : (
                      <EditableBlock
                        html={tb.html}
                        onHtmlChange={h => updateTextBlock(pId, i, h)}
                        isEditing={isAuth}
                        className={`text-foreground/70 leading-relaxed [&_p]:mb-1 ${SIZE_CLASS[(draft.sizes[`tb-${pId}-${i}`] as TextSize) ?? "normal"]}`}
                        onFocused={focusBlock(`tb-${pId}-${i}`)}
                      />
                    )}
                    {isAuth && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <input type="url" placeholder="link url (makes whole block clickable)"
                          value={tb.href ?? ""}
                          onChange={e => updateTextBlockHref(pId, i, e.target.value)}
                          className="flex-1 text-xs px-2 py-0.5 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                        />
                        <button onClick={() => removeTextBlock(pId, i)}
                          className="w-5 h-5 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0">
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Images */}
                {(media?.images ?? []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(media?.images ?? []).map((src, i) => (
                      <div key={i} className="relative inline-block">
                        <img src={src} alt="" className="max-w-full rounded" style={{ maxHeight: 260 }} />
                        {isAuth && (
                          <button onClick={() => removeImage(pId, i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Embeds */}
                {(media?.embeds ?? []).map((embed, i) => (
                  <div key={i} className="relative mt-4">
                    <div dangerouslySetInnerHTML={{ __html: embed.html }} />
                    {isAuth && (
                      <button onClick={() => removeEmbed(pId, i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Admin controls */}
                {isAuth && (
                  <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-3">
                    <button onClick={() => addTextBlock(pId)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1">
                      + add text
                    </button>
                    <label className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1 cursor-pointer">
                      + add image
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) addImage(pId, f); e.target.value = ""; }} />
                    </label>
                    <div className="flex items-center gap-1">
                      <input type="text" placeholder="paste twitter/x url..."
                        value={embedInputs[pId] ?? ""}
                        onChange={e => setEmbedInputs(prev => ({ ...prev, [pId]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleEmbed(pId)}
                        className="text-xs px-2 py-1 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 w-44"
                      />
                      <button onClick={() => handleEmbed(pId)} disabled={embedLoading === pId}
                        className="text-xs px-2 py-1 border border-border rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                        {embedLoading === pId ? "…" : "embed post"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Katelyn;
