import { NavLink } from "react-router-dom";

const BLUE = "#3AACAC";

const FloatingFooter = () => (
  <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-10 py-3 bg-background/80 backdrop-blur-sm border-t border-border">
    <NavLink to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
      <img src="/whorl.png" alt="whorl" className="w-5 h-5 opacity-80" />
      <span className="font-sans text-xs tracking-wide" style={{ color: BLUE }}>
        Reel Museum 2026
      </span>
    </NavLink>
    <NavLink
      to="/about"
      className="text-xs tracking-wide transition-opacity hover:opacity-70"
      style={{ color: BLUE }}
    >
      about
    </NavLink>
  </div>
);

export default FloatingFooter;
