import { useEffect, useRef, useState } from "react";
import "./LandingOverlay.css";

const LandingOverlay = () => {
  const [dissolve, setDissolve] = useState(false);
  const [removed, setRemoved] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dismiss = () => {
    if (triggered.current) return;
    triggered.current = true;

    const whorl = document.getElementById("rm-whorl");
    whorl?.classList.add("rm-spinning-fast");

    setTimeout(() => setDissolve(true), 1200);
    setTimeout(() => {
      setRemoved(true);
      document.body.style.overflow = "";
    }, 1800);
  };

  if (removed) return null;

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
        <p id="rm-label">tap to explore the archive</p>
        <img
          id="rm-whorl"
          src="/whorl.png"
          alt="Spindle whorl"
          draggable={false}
        />
        <p id="rm-title">Reel Museum</p>
      </div>
    </div>
  );
};

export default LandingOverlay;
