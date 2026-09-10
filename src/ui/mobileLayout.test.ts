import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = ["auth.css", "publisher.css"]
  .map((fileName) => readFileSync(new URL(`../styles/${fileName}`, import.meta.url), "utf8"))
  .join("\n");

describe("Android mobile layout contract", () => {
  it("supports the 320px through 1024px phone and tablet range", () => {
    expect(styles).toContain("--publisher-max-width: 1024px");
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

  it("provides portrait and landscape tablet layouts", () => {
    expect(styles).toContain("@media (min-width: 600px)");
    expect(styles).toContain("@media (min-width: 700px) and (orientation: landscape)");
    expect(styles).not.toContain("visibility: hidden");
  });

  it("keeps header content stable on narrow screens", () => {
    expect(styles).toMatch(/\.topbar__title\s*\{[^}]*min-width:\s*0/);
    expect(styles).toMatch(/\.topbar__title span\s*\{[\s\S]*?text-overflow:\s*ellipsis/);
    expect(styles).toMatch(/\.battery\s*\{[^}]*white-space:\s*nowrap/);
    expect(styles).toMatch(/\.level__calibrate\s*\{[\s\S]*?white-space:\s*nowrap/);
    expect(styles).toContain("@media (max-width: 359px)");
  });
});
