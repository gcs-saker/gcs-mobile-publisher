import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync(new URL("./organisms/PublisherHeader.tsx", import.meta.url), "utf8");

describe("publisher header privacy contract", () => {
  it("does not render the server stream identifier", () => {
    expect(header).not.toContain("streamId");
    expect(header).toContain("보안 송출 채널");
  });
});
