import { useState, useEffect, useRef } from "react";
import { ChevronDown, X, Bold, Italic, Link2, ArrowUp, ArrowDown } from "lucide-react";

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

// ─── Constants ─────────────────────────────────────────────────────────────────

const LS_CONTENT = "katelyn_page_content";
const SS_AUTH    = "katelyn_admin_auth";

const SIZE_CLASS: Record<TextSize, string> = {
  small:   "text-xs",
  normal:  "text-sm",
  large:   "text-base md:text-lg",
  heading: "font-serif text-xl md:text-2xl",
};

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
  { id: "reel-museum", title: "reel museum (current)", body:
    "independent producer and creative technologist.\n" +
    "building reel museum — a museum without walls, celebrating 5,000 years of textiles and human craftsmanship across global collections.\n" +
    "currently at: reelmuseum.com" },
  { id: "craicathon", title: "craicathon (2026)", body:
    "ireland's first irish language hackathon.\n" +
    "100 attendees, 24 teams, held at dogpatch labs during seachtain na gaeilge.\n" +
    "organised and produced independently." },
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
  { id: "lace", title: "lace & textile research", body:
    "— working with irish lace archives in ireland and new york\n— lace and textile archive project with the guild of irish lacemakers\n" +
    "— antonio ratti textile centre research visit, met museum, new york\n— archives of the fashion institute of technology research visit, new york" },
  { id: "editorial", title: "editorial & communications", body:
    "— executive editor, echoes east-galway historical journal (2021–present)\n— colonial legacies research project, trinity college dublin\n" +
    "— food and drink editor, trinity news (2022/23)\n— editor, iscg review, irish student consulting group (2021/22)\n" +
    "— publishing and marketing intern, the nenagh guardian (2022)\n— published poetry in icarus and the attic\n— all publications designed using adobe suite" },
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

function FloatingToolbar({
  anchor, size, onSizeChange,
}: {
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
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 300 }}
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

// ─── oEmbed fetch ──────────────────────────────────────────────────────────────

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
  const [isAuth, setIsAuth]   = useState(() => sessionStorage.getItem(SS_AUTH) === "true");
  const [saved,  setSaved]    = useState<PageContent>(loadContent);
  const [draft,  setDraft]    = useState<PageContent>(loadContent);
  const [open,   setOpen]     = useState<Set<string>>(new Set());
  const [activeEl,  setActiveEl]  = useState<HTMLElement | null>(null);
  const [activeKey, setActiveKey] = useState("");
  const [embedInputs, setEmbedInputs] = useState<Record<string, string>>({});
  const [embedLoading, setEmbedLoading] = useState<string | null>(null);

  const footerClicks = useRef(0);
  const footerTimer  = useRef<ReturnType<typeof setTimeout>>();

  const hasUnsaved = JSON.stringify(draft) !== JSON.stringify(saved);

  // Load Twitter widget when embeds are present
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

  const handleSave = () => { persistContent(draft); setSaved(draft); };
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

  // ── Media ─────────────────────────────────────────────────────────────────────

  const addImage = (projectId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setDraft(p => ({ ...p, media: { ...p.media, [projectId]: {
        images: [...(p.media[projectId]?.images ?? []), b64],
        embeds: p.media[projectId]?.embeds ?? [],
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
      images:  p.media[projectId]?.images  ?? [],
      embeds:  p.media[projectId]?.embeds  ?? [],
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

  const moveProject = (id: string, dir: "up" | "down") =>
    setDraft(p => {
      const arr = [...p.projects];
      const i = arr.findIndex(pr => pr.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, projects: arr };
    });

  const addProject = () =>
    setDraft(p => ({
      ...p,
      projects: [...p.projects, { id: `project-${Date.now()}`, title: "new section", body: "" }],
    }));

  const removeProject = (id: string) =>
    setDraft(p => ({ ...p, projects: p.projects.filter(pr => pr.id !== id) }));

  // ── Toolbar ───────────────────────────────────────────────────────────────────

  const focusBlock = (key: string) => (el: HTMLElement) => { setActiveEl(el); setActiveKey(key); };
  const currentSize: TextSize = (draft.sizes[activeKey] as TextSize) ?? (activeKey === "about" ? "large" : "normal");
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 md:px-10 pb-24 max-w-2xl">

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
      <div className="mt-2 mb-10">
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-1">katelyn davis</h1>
        <p className="font-serif text-lg text-foreground/60 mb-4">marketer. designer. researcher. builder.</p>
        <p className="text-sm text-muted-foreground mb-3">born in galway, building in dublin</p>
        <div className="flex items-center gap-4 text-sm">
          <a href="https://linkedin.com/in/katelyn-davis" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">linkedin</a>
          <a href="https://kat3lyn.substack.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">substack</a>
          <a href="mailto:katelynemdavis@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors">mail</a>
        </div>
      </div>

      {/* About */}
      <div className="mb-10">
        <EditableBlock
          html={draft.about}
          onHtmlChange={setAbout}
          isEditing={isAuth}
          className={`font-serif leading-relaxed text-foreground/80 ${SIZE_CLASS[(draft.sizes["about"] as TextSize) ?? "large"]}`}
          onFocused={focusBlock("about")}
        />
      </div>

      {/* Projects */}
      <div className="mb-12">
        <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-4">projects</h2>
        <div className="divide-y divide-border">
          {draft.projects.map(p => (
            <div key={p.id}>
              <div
                className={`py-4 flex items-center justify-between ${!isAuth ? "cursor-pointer group" : ""}`}
                onClick={!isAuth ? () => toggle(p.id) : undefined}
              >
                {p.id === "reel-museum" && (
                  <img src="/favicon.png" alt="" className="w-4 h-4 mr-2 flex-shrink-0 opacity-70" />
                )}
                {isAuth ? (
                  <EditableBlock
                    html={p.title}
                    onHtmlChange={h => setProjectTitle(p.id, h)}
                    isEditing
                    className={`font-serif text-foreground flex-1 ${SIZE_CLASS[(draft.sizes[`title-${p.id}`] as TextSize) ?? "normal"]}`}
                    onFocused={focusBlock(`title-${p.id}`)}
                  />
                ) : (
                  <span
                    className="font-serif text-base text-foreground group-hover:text-foreground/80 transition-colors"
                    dangerouslySetInnerHTML={{ __html: p.title }}
                  />
                )}
                <div className="flex items-center gap-0.5 flex-shrink-0 ml-3">
                  {isAuth && (
                    <>
                      <button onClick={() => moveProject(p.id, "up")}
                        disabled={draft.projects.indexOf(p) === 0}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveProject(p.id, "down")}
                        disabled={draft.projects.indexOf(p) === draft.projects.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeProject(p.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="remove section">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={isAuth ? () => toggle(p.id) : undefined}
                    className="p-1"
                  >
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open.has(p.id) ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {open.has(p.id) && (
                <div className="pb-4 pr-6">
                  <EditableBlock
                    html={p.body}
                    onHtmlChange={h => setProjectBody(p.id, h)}
                    isEditing={isAuth}
                    className={`text-foreground/70 leading-relaxed [&_p]:mb-1 ${SIZE_CLASS[(draft.sizes[`body-${p.id}`] as TextSize) ?? "normal"]}`}
                    onFocused={focusBlock(`body-${p.id}`)}
                  />

                  {/* Extra text blocks */}
                  {(draft.media[p.id]?.textBlocks ?? []).map((tb, i) => (
                    <div key={i} className="relative mt-3">
                      {tb.href && !isAuth ? (
                        <a href={tb.href} target="_blank" rel="noopener noreferrer"
                          className={`block text-foreground/70 leading-relaxed [&_p]:mb-1 hover:text-foreground transition-colors underline underline-offset-2 ${SIZE_CLASS[(draft.sizes[`tb-${p.id}-${i}`] as TextSize) ?? "normal"]}`}
                          dangerouslySetInnerHTML={{ __html: tb.html }}
                        />
                      ) : (
                        <EditableBlock
                          html={tb.html}
                          onHtmlChange={h => updateTextBlock(p.id, i, h)}
                          isEditing={isAuth}
                          className={`text-foreground/70 leading-relaxed [&_p]:mb-1 ${SIZE_CLASS[(draft.sizes[`tb-${p.id}-${i}`] as TextSize) ?? "normal"]}`}
                          onFocused={focusBlock(`tb-${p.id}-${i}`)}
                        />
                      )}
                      {isAuth && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <input
                            type="url"
                            placeholder="link url (makes whole block clickable)"
                            value={tb.href ?? ""}
                            onChange={e => updateTextBlockHref(p.id, i, e.target.value)}
                            className="flex-1 text-xs px-2 py-0.5 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                          />
                          <button onClick={() => removeTextBlock(p.id, i)}
                            className="w-5 h-5 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Images */}
                  {(draft.media[p.id]?.images ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(draft.media[p.id]?.images ?? []).map((src, i) => (
                        <div key={i} className="relative inline-block">
                          <img src={src} alt="" className="max-w-full rounded" style={{ maxHeight: 280 }} />
                          {isAuth && (
                            <button onClick={() => removeImage(p.id, i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Embeds */}
                  {(draft.media[p.id]?.embeds ?? []).map((embed, i) => (
                    <div key={i} className="relative mt-3">
                      <div dangerouslySetInnerHTML={{ __html: embed.html }} />
                      {isAuth && (
                        <button onClick={() => removeEmbed(p.id, i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Admin media controls */}
                  {isAuth && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button onClick={() => addTextBlock(p.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1">
                        + add text
                      </button>
                      <label className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1 cursor-pointer">
                        + add image
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) addImage(p.id, f); e.target.value = ""; }} />
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="paste twitter/x url..."
                          value={embedInputs[p.id] ?? ""}
                          onChange={e => setEmbedInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleEmbed(p.id)}
                          className="text-xs px-2 py-1 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 w-44"
                        />
                        <button onClick={() => handleEmbed(p.id)} disabled={embedLoading === p.id}
                          className="text-xs px-2 py-1 border border-border rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                          {embedLoading === p.id ? "…" : "embed post"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAuth && (
        <button onClick={addProject}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded px-3 py-2 w-full">
          + add section
        </button>
      )}

      {/* Education */}
      <div className="mb-12">
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
      <div className="border-t border-border pt-6">
        <p
          className="text-xs text-muted-foreground leading-relaxed cursor-default select-none"
          onClick={handleFooterClick}
        >
          this page is not linked from the main site. if you have it, please share me responsibly.
        </p>
        <a
          href="https://reelmuseum.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 group w-fit"
        >
          <img src="/favicon.png" alt="Reel Museum" className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs text-foreground/70 group-hover:text-foreground transition-colors">reelmuseum.com</span>
        </a>
      </div>

      {/* Save bar */}
      {isAuth && hasUnsaved && (
        <div className="fixed bottom-0 left-0 right-0 z-[400] flex items-center justify-center gap-4 py-3 px-4 bg-background/95 border-t border-border backdrop-blur-sm">
          <span className="text-xs text-muted-foreground">unsaved changes</span>
          <button onClick={handleSave}
            className="text-xs px-3 py-1.5 bg-foreground text-background rounded hover:opacity-90 transition-opacity">
            save changes
          </button>
          <button onClick={handleCancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Katelyn;
