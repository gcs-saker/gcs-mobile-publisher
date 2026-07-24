import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
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
});
