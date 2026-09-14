import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");
const qualityWorkflow = readFileSync(".github/workflows/quality.yml", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/signed-release.yml", "utf8");

describe("mobile release supply chain", () => {
  it("pins every container base to an immutable digest", () => {
    const baseImages = dockerfile.match(/^FROM\s+\S+/gm) ?? [];

    expect(baseImages).toHaveLength(2);
    expect(baseImages.every((image) => /@sha256:[a-f0-9]{64}$/.test(image))).toBe(true);
  });

  it("pins every GitHub Action to an immutable commit", () => {
    const actionUses = `${qualityWorkflow}\n${releaseWorkflow}`.match(/uses:\s+\S+/g) ?? [];

    expect(actionUses.length).toBeGreaterThan(0);
    expect(actionUses.every((action) => /@[a-f0-9]{40}$/.test(action))).toBe(true);
  });

  it("requires SBOM, vulnerability, provenance, and signature evidence", () => {
    const requiredControls = [
      "anchore/sbom-action@",
      "anchore/scan-action@",
      "actions/attest@",
      "cosign sign --yes",
      "cosign verify",
      "mobile-publisher.cosign.bundle.json"
    ];

    expect(requiredControls.every((control) => releaseWorkflow.includes(control))).toBe(true);
  });
});
