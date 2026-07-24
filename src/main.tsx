import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RuntimeProvider } from "./app/RuntimeProvider";
import { PublisherStoreProvider } from "./features/publisher/application/PublisherStoreProvider";
import { StorageProvider } from "./features/storage/application/StorageProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider>
      <StorageProvider>
        <PublisherStoreProvider>
          <App />
        </PublisherStoreProvider>
      </StorageProvider>
    </RuntimeProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
