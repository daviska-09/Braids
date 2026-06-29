import { NavLink } from "react-router-dom";
import { useLanguage, useT, type Lang } from "@/contexts/LanguageContext";

const LANGS: Lang[] = ["en", "fr", "nl"];

const Header = () => {
  const { lang, setLang } = useLanguage();
  const t = useT();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 md:px-10 py-3 md:py-5 overflow-x-hidden">
        <nav className="flex items-center gap-4 md:gap-8 text-sm tracking-wide">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `whitespace-nowrap ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
            {t.nav.mainArchive}
          </NavLink>
          <NavLink
            to="/lace-archive"
            className={({ isActive }) =>
              `whitespace-nowrap ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
            {t.nav.laceArchive}
          </NavLink>
          <NavLink
            to="/explored"
            className={({ isActive }) =>
              `whitespace-nowrap ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
            {t.nav.explored}
          </NavLink>
          <NavLink
            to="/field-notes"
            className={({ isActive }) =>
              `whitespace-nowrap ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
            {t.nav.fieldNotes}
          </NavLink>
        </nav>
        <div className="flex items-center gap-3 text-xs tracking-widest">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={lang === l
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground transition-colors"}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
