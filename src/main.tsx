import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAnalytics } from "./integration/analytics";
import { initSiteQuality } from "./integration/site-quality";

const initialLoader = document.getElementById("initial-loader");

// Keep a tiny, dependency-free loader visible while the React bundle is being
// downloaded and parsed. This is intentionally outside React so it can appear
// before the application JavaScript starts.
if (initialLoader) {
  window.setTimeout(() => initialLoader.classList.add("is-leaving"), 900);
  window.setTimeout(() => initialLoader.remove(), 1250);
}

initAnalytics();
initSiteQuality();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
