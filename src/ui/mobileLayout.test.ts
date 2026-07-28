import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("Android mobile layout contract", () => {
  it("supports the 360px through 480px publisher width range", () => {
    expect(styles).toContain("--publisher-max-width: 480px");
    expect(styles).toMatch(/min-width:\s*320px/);
    expect(styles).toMatch(/min\(100%,\s*var\(--publisher-max-width\)\)/);
  });

  it("uses dynamic viewport units and Android safe-area insets", () => {
    expect(styles).toContain("100dvh");
    expect(styles).toContain("env(safe-area-inset-top)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
  });

  it("maintains 48px interactive targets", () => {
    expect(styles).toContain("--touch-target: 48px");
    expect(styles).toMatch(/\.button\s*\{[\s\S]*?min-height:\s*var\(--touch-target\)/);
    expect(styles).toMatch(/\.fields input\s*\{[\s\S]*?min-height:\s*var\(--touch-target\)/);
  });

  it("provides a compact layout for 360x640-class screens", () => {
    expect(styles).toContain("@media (max-height: 720px) and (orientation: portrait)");
    expect(styles).toMatch(/\.control-sheet\s*\{[\s\S]*?max-height:\s*46dvh/);
  });
});
