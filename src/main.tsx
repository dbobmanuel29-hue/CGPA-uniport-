import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initAnalytics } from "./integration/analytics";
import { initSiteQuality } from "./integration/site-quality";

// Render the UI immediately. Backend/auth integrations are initialized by
// SessionProvider after first paint so a slow Firebase/CDN response cannot
// block the public site from appearing.
initAnalytics();
initSiteQuality();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
