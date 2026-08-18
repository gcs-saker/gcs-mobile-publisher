import { describe, expect, it } from "vitest";
import {
  cardinalDirection, compassIndicator, screenAdjustedTilt, shortestAngleDelta,
  smoothAngle, smoothLinear, tiltIndicator,
} from "./orientationIndicators";

describe("orientation indicators", () => {
  it.each([
    [0, "N"], [22.5, "NE"], [90, "E"], [180, "S"], [270, "W"], [337.5, "N"],
  ])("maps %s degrees to %s", (heading, direction) => {
    expect(cardinalDirection(heading)).toBe(direction);
  });

  it("converts absolute alpha rotation to compass heading", () => {
    expect(compassIndicator(30, true)).toEqual({ direction: "NW", heading: 330 });
  });

  it("does not claim a cardinal direction for relative orientation", () => {
    expect(compassIndicator(30, false)).toBeNull();
  });

  it("subtracts the calibrated level and reverses CSS axes", () => {
    expect(tiltIndicator({ beta: 14, gamma: -8 }, { beta: 10, gamma: -3 })).toEqual({
      horizontalPixels: 5,
      pitchDegrees: 4,
      pitchLabel: "상단 들림",
      rollDegrees: -5,
      rollLabel: "좌측 기울기",
      verticalPixels: -4,
    });
  });

  it("uses the shortest delta across the 180 degree boundary", () => {
    expect(shortestAngleDelta(-179, 179)).toBe(2);
    expect(tiltIndicator({ beta: -179, gamma: 179 }, { beta: 179, gamma: -179 }))
      .toMatchObject({ pitchDegrees: 2, rollDegrees: -2 });
  });

  it("keeps the level dot inside compact crosshairs", () => {
    expect(tiltIndicator({ beta: 90, gamma: -90 }, { beta: 0, gamma: 0 }))
      .toMatchObject({ horizontalPixels: 26, verticalPixels: -26 });
  });

  it("rotates tilt axes with the screen and rejects non-finite samples", () => {
    expect(screenAdjustedTilt(10, 20, 90)).toEqual({ beta: -20, gamma: 10 });
    expect(screenAdjustedTilt(Number.NaN, 20, 0)).toEqual({ beta: null, gamma: 20 });
  });

  it("smooths circular and linear sensor noise", () => {
    expect(smoothAngle(359, 1)).toBeCloseTo(359.5);
    expect(smoothLinear(0, 4)).toBe(1);
    expect(smoothLinear(1, Number.NaN)).toBe(1);
  });
});
