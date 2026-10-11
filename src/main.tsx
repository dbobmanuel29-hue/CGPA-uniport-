import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAnalytics } from "./integration/analytics";
import { initSiteQuality } from "./integration/site-quality";

// Dismiss the initial loader as soon as React has mounted the app.
// Avoid a fixed wait: it used to hold the screen for 900ms even when the page
// was already ready, making the logo and workspace actions feel delayed.
function DismissInitialLoader() {
  useEffect(() => {
    const initialLoader = document.getElementById("initial-loader");
    if (!initialLoader) return;
    const frame = window.requestAnimationFrame(() => {
      initialLoader.classList.add("is-leaving");
      window.setTimeout(() => initialLoader.remove(), 220);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return null;
}

initAnalytics();
initSiteQuality();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DismissInitialLoader />
    <App />
  </StrictMode>
);
