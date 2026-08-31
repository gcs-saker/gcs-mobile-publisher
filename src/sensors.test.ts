import { describe, expect, it, vi } from "vitest";
import { buildTelemetryPayload, emptySnapshot } from "./sensors";

describe("buildTelemetryPayload", () => {
  it("adds stream identity and elapsed seconds", () => {
    vi.spyOn(Date, "now").mockReturnValue(13_000);
    const clock = { now: () => 13_000, isoNow: () => "unused" };
    expect(buildTelemetryPayload("CID007", 10_000, emptySnapshot, 6, clock, "Android Chrome")).toMatchObject({
      uuid: "CID007",
      epochTime: 3,
      userAgent: "Android Chrome",
    });
  });

  it("applies the selected coordinate precision to transmitted telemetry", () => {
    const clock = { now: () => 13_000, isoNow: () => "unused" };
    const snapshot = {
      ...emptySnapshot,
      location: { ...emptySnapshot.location, latitude: 36.11995, longitude: 128.36337 },
    };

    const payload = buildTelemetryPayload("CID007", 10_000, snapshot, 0, clock, "Android Chrome");

    expect(payload.location.latitude).toBe(36);
    expect(payload.location.longitude).toBe(128);
  });

  it("preserves six decimal places for the default GPS transmission precision", () => {
    const clock = { now: () => 13_000, isoNow: () => "unused" };
    const snapshot = {
      ...emptySnapshot,
      location: { ...emptySnapshot.location, latitude: 35.1234567, longitude: 128.9876543 },
    };
    const payload = buildTelemetryPayload("CID007", 10_000, snapshot, 6, clock, "Android");

    expect(payload.location.latitude).toBe(35.123457);
    expect(payload.location.longitude).toBe(128.987654);
  });
});
