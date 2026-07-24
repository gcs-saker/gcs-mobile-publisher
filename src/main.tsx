import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RuntimeProvider } from "./app/RuntimeProvider";
import { PublisherStoreProvider } from "./features/publisher/application/PublisherStoreProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider>
      <PublisherStoreProvider>
        <App />
      </PublisherStoreProvider>
    </RuntimeProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
