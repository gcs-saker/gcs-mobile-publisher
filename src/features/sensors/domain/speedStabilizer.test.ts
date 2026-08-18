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
  it("requires repeated movement evidence before leaving the stationary state", () => {
    const stabilizer = createSpeedStabilizer();

    expect(stabilizer.update(reading({ reportedSpeedMps: 0.9 }))).toBe(0);
    expect(stabilizer.update(reading({ latitude: 37.56651, measuredAtMs: 2_000, reportedSpeedMps: 1.1 }))).toBe(0);
  });

  it("rejects one implausible reported-speed spike", () => {
    const stabilizer = createSpeedStabilizer();
    [4, 4.2, 30, 3.9, 4.1].forEach((speed, index) => {
      stabilizer.update(reading({
        latitude: 37.5665 + index * 0.000036,
        measuredAtMs: (index + 1) * 1_000,
        reportedSpeedMps: speed,
      }));
    });

    expect(stabilizer.value()).toBeGreaterThan(3.5);
    expect(stabilizer.value()).toBeLessThan(5);
  });

  it("expires a retained speed after prolonged unusable fixes", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: 5 }));

    expect(stabilizer.update(reading({ accuracy: 80, measuredAtMs: 3_000, reportedSpeedMps: 22 }))).toBe(5);
    expect(stabilizer.update(reading({ accuracy: 80, measuredAtMs: 12_000, reportedSpeedMps: 22 }))).toBeNull();
  });

  it("derives speed only when displacement exceeds the location uncertainty", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: null }));

    expect(stabilizer.update(reading({
      latitude: 37.56651,
      measuredAtMs: 3_000,
      reportedSpeedMps: null,
    }))).toBe(0);

    const speed = stabilizer.update(reading({
      latitude: 37.56668,
      measuredAtMs: 6_000,
      reportedSpeedMps: null,
    }));
    expect(speed).toBeGreaterThan(3);
    expect(speed).toBeLessThan(7);
  });

  it("ignores out-of-order fixes", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ measuredAtMs: 2_000, reportedSpeedMps: 4 }));

    expect(stabilizer.update(reading({ measuredAtMs: 1_000, reportedSpeedMps: 20 }))).toBe(4);
  });

  it("reaches zero after three stationary fixes instead of retaining motion", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: 5 }));
    stabilizer.update(reading({ measuredAtMs: 2_000, reportedSpeedMps: 0.3 }));
    stabilizer.update(reading({ measuredAtMs: 3_000, reportedSpeedMps: 0.2 }));

    expect(stabilizer.update(reading({ measuredAtMs: 4_000, reportedSpeedMps: 0.1 }))).toBe(0);
  });

  it("resets all history between sensor sessions", () => {
    const stabilizer = createSpeedStabilizer();
    stabilizer.update(reading({ reportedSpeedMps: 8 }));
    stabilizer.reset();

    expect(stabilizer.value()).toBeNull();
  });
});
