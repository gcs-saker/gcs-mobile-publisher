import { describe, expect, it } from "vitest";

import { formatAltitude } from "./TelemetryGrid";

describe("TelemetryGrid", () => {
  it("formats the altitude collected by the mobile location sensor", () => {
    expect(formatAltitude(85.4)).toBe("85.4 m");
  });

  it("shows a waiting value before altitude is available", () => {
    expect(formatAltitude(null)).toBe("--");
  });
});
