import { useEffect } from "react";
import DockLabShell from "@/components/dock-lab/DockLabShell";

export default function DockLab() {
  useEffect(() => {
    document.title = "Dock Lab — Locus";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    const prev = robots.getAttribute("content");
    robots.setAttribute("content", "noindex, nofollow");
    return () => {
      if (prev) robots!.setAttribute("content", prev);
      else robots!.remove();
    };
  }, []);

  return <DockLabShell />;
}
