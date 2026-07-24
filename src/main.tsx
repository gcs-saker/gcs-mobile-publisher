import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RuntimeProvider } from "./app/RuntimeProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider>
      <App />
    </RuntimeProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
