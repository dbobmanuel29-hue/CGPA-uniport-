import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerFirebaseBackend } from "./integration";
import { registerReportAdminFix } from "./integration/report-admin-fix";
import { registerCloudinaryAdapter } from "./integration/cloudinary-adapter";
import { registerAccountCleanup } from "./integration/account-cleanup";
import { initAnalytics } from "./integration/analytics";
import { initSiteQuality } from "./integration/site-quality";

initAnalytics();
initSiteQuality();

registerFirebaseBackend()
  .then(() => registerCloudinaryAdapter())
  .then(() => registerAccountCleanup())
  .then(() => registerReportAdminFix())
  .catch(error => console.error("CGPA+ backend initialization failed", error))
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
