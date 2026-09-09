import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerFirebaseBackend } from "./integration";

registerFirebaseBackend()
  .catch(error => console.error("CGPA+ backend initialization failed", error))
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
