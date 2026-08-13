import { describe, expect, it } from "vitest";
import { createSpeedStabilizer, type PositionReading } from "./speedStabilizer";

function reading(overrides: Partial<PositionReading> = {}): PositionReading {
  return {
    accuracy: 5,
    latitude: 37.5665,
    longitude: 126.978,
    measuredAtMs: 1_000,
    reportedSpeedMps: 0,
    ...overrides,
  };
}

describe("speed stabilizer", () => {
  it("pins sub-walking GPS noise to zero", () => {
    const stabilizer = createSpeedStabilizer();

    expect(stabilizer.update(reading({ reportedSpeedMps: 0.18 }))).toBe(0);
    expect(stabilizer.update(reading({ measuredAtMs: 2_000, reportedSpeedMps: 0.42 }))).toBe(0);
  });

  it("uses a rolling median so a single spike cannot dominate", () => {
    const stabilizer = createSpeedStabilizer();
    [4, 4.2, 30, 3.9, 4.1].forEach((speed, index) => {
      stabilizer.update(reading({ measuredAtMs: (index + 1) * 1_000, reportedSpeedMps: speed }));
    });

    expect(stabilizer.value()).toBe(4.1);
  });

  it("ignores low-accuracy fixes instead of replacing a stable value", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: 5 }));

    expect(stabilizer.update(reading({ accuracy: 80, measuredAtMs: 2_000, reportedSpeedMps: 22 }))).toBe(5);
  });

  it("derives speed from distance when the browser does not report it", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: null }));

    const speed = stabilizer.update(reading({
      latitude: 37.56659,
      measuredAtMs: 3_000,
      reportedSpeedMps: null,
    }));

    expect(speed).toBeGreaterThan(4);
    expect(speed).toBeLessThan(6);
  });

  it("resets all history between sensor sessions", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: 8 }));
    stabilizer.reset();

    expect(stabilizer.value()).toBeNull();
  });
});
