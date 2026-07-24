import { describe, expect, it, vi } from "vitest";
import { buildTelemetryPayload, emptySnapshot } from "./sensors";

describe("buildTelemetryPayload", () => {
  it("adds stream identity and elapsed seconds", () => {
    vi.spyOn(Date, "now").mockReturnValue(13_000);
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "Android Chrome" },
      configurable: true,
    });
    expect(buildTelemetryPayload("CID007", 10_000, emptySnapshot)).toMatchObject({
      uuid: "CID007",
      epochTime: 3,
      userAgent: "Android Chrome",
    });
  });
});
