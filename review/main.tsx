import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Board } from "./Board";
import { Library } from "./Library";

// Two pages, by hash: #/ is the library, #/reel/<slug> is one reel's board.
const route = () => {
  const m = location.hash.match(/^#\/reel\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

const App: React.FC = () => {
  const [slug, setSlug] = useState(route);
  useEffect(() => {
    const on = () => {
      setSlug(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return slug ? <Board key={slug} slug={slug} /> : <Library />;
};

createRoot(document.getElementById("root")!).render(<App />);
