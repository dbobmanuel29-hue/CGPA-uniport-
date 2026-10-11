import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAnalytics } from "./integration/analytics";
import { initSiteQuality } from "./integration/site-quality";
import { getFirebase } from "./integration/firebase-client.js";

// Keep the loader visible briefly while the app renders and Firebase begins
// resolving the signed-in state, so the page is less likely to appear half-ready.
function DismissInitialLoader() {
  useEffect(() => {
    const initialLoader = document.getElementById("initial-loader");
    if (!initialLoader) return;
    let frame = 0;
    const delay = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        initialLoader.classList.add("is-leaving");
        window.setTimeout(() => initialLoader.remove(), 220);
      });
    }, 900);
    return () => {
      window.clearTimeout(delay);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

initAnalytics();
initSiteQuality();

// Start Firebase SDK loading while React is mounting so the signed-in state and
// role-specific workspace actions can resolve sooner after the loader fades.
void getFirebase().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DismissInitialLoader />
    <App />
  </StrictMode>
);
