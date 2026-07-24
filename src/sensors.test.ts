import { describe, expect, it, vi } from "vitest";
import { buildTelemetryPayload, emptySnapshot } from "./sensors";

describe("buildTelemetryPayload", () => {
  it("adds stream identity and elapsed seconds", () => {
    vi.spyOn(Date, "now").mockReturnValue(13_000);
    const clock = { now: () => 13_000, isoNow: () => "unused" };
    expect(buildTelemetryPayload("CID007", 10_000, emptySnapshot, clock, "Android Chrome")).toMatchObject({
      uuid: "CID007",
      epochTime: 3,
      userAgent: "Android Chrome",
    });
  });
});
