import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RuntimeProvider } from "./app/RuntimeProvider";
import { AuthenticationProvider } from "./features/auth/application/AuthenticationProvider";
import { PublisherStoreProvider } from "./features/publisher/application/PublisherStoreProvider";
import { StorageProvider } from "./features/storage/application/StorageProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider>
      <AuthenticationProvider>
        <StorageProvider>
          <PublisherStoreProvider>
            <App />
          </PublisherStoreProvider>
        </StorageProvider>
      </AuthenticationProvider>
    </RuntimeProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
