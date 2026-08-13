import { describe, expect, it } from "vitest";
import { cardinalDirection, compassIndicator, tiltIndicator } from "./orientationIndicators";

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
});
