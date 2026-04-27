import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 md:px-10 py-5 overflow-x-hidden">
        <nav className="flex items-center gap-8 text-sm tracking-wide">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            main archive
          </NavLink>
          <NavLink
            to="/lace-archive"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            lace archive
          </NavLink>
          <NavLink
            to="/uncovered"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            explored
          </NavLink>
          <NavLink
            to="/curate"
            className={({ isActive }) =>
              `flex items-center gap-1.5 ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
          saved
          </NavLink>
          <NavLink
            to="/field-notes"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            field notes
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
