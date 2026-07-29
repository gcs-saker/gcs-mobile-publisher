import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("publisher deployment contract", () => {
  it("builds assets below the publisher route", () => {
    expect(readProjectFile("vite.config.ts")).toContain('base: "/publisher/"');
  });

  it("packages the application with an isolated health endpoint", () => {
    const dockerfile = readProjectFile("Dockerfile");
    const nginxConfiguration = readProjectFile("deploy/nginx.conf");

    expect(dockerfile).toContain("FROM nginx:");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(nginxConfiguration).toContain("location = /healthz");
    expect(nginxConfiguration).toContain("location /publisher/");
  });
});
