import { useEffect, useRef, useState } from "react";
import "./LandingOverlay.css";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";

const SEEN_KEY = "reel_overlay_seen";

const LABELS: Record<Lang, { text: string; chars: number; width: string }> = {
  en: { text: "tap to explore the archive",     chars: 26, width: "calc(26ch + 1.2em)" },
  fr: { text: "touchez pour explorer l'archive", chars: 31, width: "calc(31ch + 1.5em)" },
  nl: { text: "tik om het archief te verkennen", chars: 31, width: "calc(31ch + 1.5em)" },
};

const LandingOverlay = () => {
  const [dissolve, setDissolve] = useState(false);
  const [removed, setRemoved] = useState(() => !!sessionStorage.getItem(SEEN_KEY));
  const { lang, setLang } = useLanguage();
  const triggered = useRef(false);

  useEffect(() => {
    if (removed) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [removed]);

  const dismiss = () => {
    if (triggered.current) return;
    triggered.current = true;

    const whorl = document.getElementById("rm-whorl");
    whorl?.classList.add("rm-spinning-fast");

    setTimeout(() => setDissolve(true), 1200);
    setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, "1");
      setRemoved(true);
      document.body.style.overflow = "";
    }, 1800);
  };

  if (removed) return null;

  const { text, chars, width } = LABELS[lang];

  return (
    <div
      id="rm-landing-overlay"
      className={dissolve ? "rm-dissolve" : ""}
      aria-label="Tap to explore the archive"
      role="button"
      tabIndex={0}
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismiss();
        }
      }}
    >
      <div id="rm-glass" />
      <div id="rm-stage">
        <p
          id="rm-label"
          key={lang}
          style={{
            animation: `rm-typing 0.8s steps(${chars}, end) 0.2s forwards`,
            ["--rm-label-width" as string]: width,
          }}
        >
          {text}
        </p>
        <img
          id="rm-whorl"
          src="/whorl.png"
          alt="Spindle whorl"
          draggable={false}
        />
        <p id="rm-title">Reel Museum</p>
      </div>

      <div
        id="rm-lang-toggle"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {(["en", "fr", "nl"] as const).map((l) => (
          <button
            key={l}
            className={lang === l ? "rm-lang-active" : ""}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LandingOverlay;
