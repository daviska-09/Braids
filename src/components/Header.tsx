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
            collection
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
            uncovered
          </NavLink>
          <NavLink
            to="/curate"
            className={({ isActive }) =>
              `flex items-center gap-1.5 ${isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}`
            }
          >
          curate
          </NavLink>
          <NavLink
            to="/journal"
            className={({ isActive }) =>
              isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            journal
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
