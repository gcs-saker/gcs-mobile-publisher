import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);
const EXPLICIT_ANY_PATTERN = /\bany\b|as\s+any\b|<any>/;

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? typescriptFiles(path) : [path];
    })
    .filter((path) => TYPESCRIPT_EXTENSIONS.has(extname(path)));
}

describe("TypeScript policy", () => {
  it("does not allow explicit any in source files", () => {
    const violations = typescriptFiles(SOURCE_ROOT)
      .filter((path) => !path.endsWith("typePolicy.test.ts"))
      .filter((path) => EXPLICIT_ANY_PATTERN.test(readFileSync(path, "utf8")));

    expect(violations).toEqual([]);
  });
});
