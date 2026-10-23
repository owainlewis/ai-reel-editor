import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Board } from "./Board";
import { Library } from "./Library";
import { StyleLab } from "./StyleLab";

// Pages, by hash: #/ is the library, #/reel/<slug> is one reel's board, #/styles/<id> is a style's lab.
const route = () => {
  const m = location.hash.match(/^#\/(reel|styles)\/([^/?#]+)/);
  return m ? { page: m[1], id: decodeURIComponent(m[2]) } : null;
};

const App: React.FC = () => {
  const [at, setAt] = useState(route);
  useEffect(() => {
    const on = () => {
      setAt(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  if (at?.page === "styles") return <StyleLab key={at.id} id={at.id} />;
  return at ? <Board key={at.id} slug={at.id} /> : <Library />;
};

createRoot(document.getElementById("root")!).render(<App />);
