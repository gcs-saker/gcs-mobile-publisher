import { describe, expect, it } from "vitest";
import { QUALITY_PROFILES, selectQuality, shouldApplyQuality } from "./quality";

describe("selectQuality", () => {
  it("uses low quality for constrained uplinks", () => {
    expect(selectQuality(500_000, 0)).toBe("low");
  });

  it("uses medium quality for moderate uplinks", () => {
    expect(selectQuality(1_200_000, 0)).toBe("medium");
  });

  it("degrades when packet loss is high", () => {
    expect(selectQuality(null, 5)).toBe("low");
    expect(selectQuality(null, 2)).toBe("medium");
  });

  it("keeps high quality on a healthy connection", () => {
    expect(selectQuality(3_000_000, 0)).toBe("high");
  });

  it("keeps the stable profile when Android does not expose uplink capacity", () => {
    expect(selectQuality(null, 0)).toBe("medium");
  });

  it("degrades immediately but requires sustained health before upgrading", () => {
    expect(shouldApplyQuality("high", "low", 0)).toBe(true);
    expect(shouldApplyQuality("low", "medium", 5)).toBe(false);
    expect(shouldApplyQuality("low", "medium", 6)).toBe(true);
  });

  it("caps the continuity profile below the previous mobile bitrate", () => {
    expect(QUALITY_PROFILES.medium.maxBitrate).toBe(1_100_000);
    expect(QUALITY_PROFILES.low.maxBitrate).toBe(450_000);
  });
});
