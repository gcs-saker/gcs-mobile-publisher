import { describe, expect, it } from "vitest";
import { selectQuality } from "./quality";

describe("selectQuality", () => {
  it("uses low quality for constrained uplinks", () => {
    expect(selectQuality(600_000, 0)).toBe("low");
  });

  it("uses medium quality for moderate uplinks", () => {
    expect(selectQuality(1_300_000, 0)).toBe("medium");
  });

  it("degrades when packet loss is high", () => {
    expect(selectQuality(null, 30)).toBe("low");
    expect(selectQuality(null, 10)).toBe("medium");
  });

  it("keeps high quality on a healthy connection", () => {
    expect(selectQuality(3_000_000, 0)).toBe("high");
  });
});
