import { describe, expect, it } from "vitest";
import { formatCoordinate, isCoordinatePrecision } from "./publisherSettings";

describe("publisher settings", () => {
  it.each([0, 1, 2, 3, 4, 5, 6])("accepts coordinate precision %s", (value) => {
    expect(isCoordinatePrecision(value)).toBe(true);
  });

  it("rejects precision outside the supported range", () => {
    expect(isCoordinatePrecision(-1)).toBe(false);
    expect(isCoordinatePrecision(7)).toBe(false);
    expect(isCoordinatePrecision(1.5)).toBe(false);
  });

  it("formats coordinates using the selected precision", () => {
    expect(formatCoordinate(37.5665, 2)).toBe("37.57");
    expect(formatCoordinate(37.5665, 6)).toBe("37.566500");
    expect(formatCoordinate(null, 2)).toBe("대기");
  });
});
