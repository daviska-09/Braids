import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

const Header = () => {
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 20) + 12);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers((v) => v + Math.floor(Math.random() * 3) - 1);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 md:px-10 py-5">
        <nav className="flex items-center gap-8 text-sm tracking-wide">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            collection
          </NavLink>
          <NavLink
            to="/uncovered"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            uncovered
          </NavLink>
          <NavLink
            to="/curate"
            className={({ isActive }) =>
              `flex items-center gap-1.5 ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            curate together
          </NavLink>
        </nav>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          {viewers} people viewing
        </div>
      </div>
    </header>
  );
};

export default Header;
