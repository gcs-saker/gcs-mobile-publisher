import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function componentFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? componentFiles(path) : [path];
  }).filter((path) => path.endsWith(".tsx"));
}

describe("frontend architecture boundaries", () => {
  it("keeps App focused on composition", () => {
    const app = source("../App.tsx");
    expect(app).toContain("usePublisherController");
    expect(app).toContain("PublisherScreen");
    expect(app).not.toMatch(/\b(fetch|navigator|RTCPeerConnection|useEffect|useState)\b/);
  });

  it("keeps the UI template free of browser and network infrastructure", () => {
    const screen = source("../ui/templates/PublisherScreen.tsx");
    expect(screen).not.toMatch(/\b(fetch|navigator|RTCPeerConnection|useEffect|useState)\b/);
  });

  it("keeps publisher behavior out of the UI template", () => {
    const screen = source("../ui/templates/PublisherScreen.tsx");
    expect(screen).not.toContain("authorizePublish");
    expect(screen).not.toContain("createWhipSession");
    expect(screen).not.toContain("sendTelemetry");
  });

  it("keeps authentication infrastructure out of its UI template", () => {
    const screen = source("../ui/templates/AuthenticationScreen.tsx");
    expect(screen).not.toMatch(/\b(fetch|sessionStorage|useEffect|useState)\b/);
    expect(screen).not.toContain("HttpAuthenticationGateway");
    expect(screen).not.toContain("AuthSessionManager");
  });

  it("keeps every Atomic UI component free of browser and HTTP infrastructure", () => {
    const uiRoot = fileURLToPath(new URL("../ui", import.meta.url));
    const violations = componentFiles(uiRoot).filter((path) =>
      /\b(fetch|navigator|RTCPeerConnection|XMLHttpRequest|useEffect)\b/.test(
        readFileSync(path, "utf8"),
      ));
    expect(violations).toEqual([]);
  });

  it("keeps PublisherScreen focused on organism composition", () => {
    const screen = source("../ui/templates/PublisherScreen.tsx");
    expect(screen).toContain("PublisherHeader");
    expect(screen).toContain("SensorDashboard");
    expect(screen).toContain("PublisherControls");
    expect(screen).not.toContain("<button");
    expect(screen).not.toContain("<input");
  });
});
