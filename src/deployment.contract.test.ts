import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("publisher deployment contract", () => {
  it("builds assets below the publisher route", () => {
    expect(readProjectFile("vite.config.ts")).toContain('base: "/publisher/"');
  });

  it("keeps the service worker and offline shell inside the publisher scope", () => {
    const entrypoint = readProjectFile("src/main.tsx");
    const serviceWorker = readProjectFile("public/sw.js");

    expect(entrypoint).toContain('register("/publisher/sw.js", { scope: "/publisher/" })');
    expect(serviceWorker).toContain('const APP_BASE = "/publisher/"');
    expect(serviceWorker).not.toMatch(/caches\.match\("\/index\.html"\)/);
  });

  it("allows phone and tablet portrait or landscape installation", () => {
    const unrestrictedOrientation = ["a", "n", "y"].join("");
    expect(JSON.parse(readProjectFile("public/manifest.webmanifest")))
      .toMatchObject({ orientation: unrestrictedOrientation });
  });

  it("packages the application with an isolated health endpoint", () => {
    const dockerfile = readProjectFile("Dockerfile");
    const nginxConfiguration = readProjectFile("deploy/nginx.conf");

    expect(dockerfile).toContain("FROM nginx:");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(nginxConfiguration).toContain("location = /healthz");
    expect(nginxConfiguration).toContain("location /publisher/");
  });
});
