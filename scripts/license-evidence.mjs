import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const allowedLicenses = new Set([
  "Apache-2.0",
  "BSD-3-Clause",
  "CC-BY-4.0",
  "ISC",
  "MIT",
  "MPL-2.0",
]);

const reportPath = process.argv[2];
const noticesPath = process.argv[3];
if (!reportPath || !noticesPath) {
  throw new Error("usage: node scripts/license-evidence.mjs REPORT NOTICES");
}

const rawInventory = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const inventory = JSON.parse(rawInventory);
const packages = [];
const blockedLicenses = [];

for (const [license, entries] of Object.entries(inventory)) {
  if (!allowedLicenses.has(license)) blockedLicenses.push(license);
  for (const entry of entries) {
    for (const version of entry.versions ?? []) {
      packages.push({
        name: entry.name,
        version,
        license,
        homepage: entry.homepage ?? "unavailable",
      });
    }
  }
}

packages.sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`));
const report = {
  schemaVersion: "gcs-saker.mobile-license-evidence.v1",
  releaseAllowed: blockedLicenses.length === 0,
  allowedLicenses: [...allowedLicenses].sort(),
  blockedLicenses: blockedLicenses.sort(),
  packageCount: packages.length,
  packages,
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const noticeLines = [
  "# Mobile Publisher third-party notices",
  "",
  "The following production dependency licenses were collected from the locked pnpm dependency graph.",
  "",
];
for (const item of packages) {
  noticeLines.push(`- ${item.name} ${item.version} — ${item.license} — ${item.homepage}`);
}
writeFileSync(noticesPath, `${noticeLines.join("\n")}\n`, "utf8");

if (!report.releaseAllowed) {
  throw new Error(`unapproved production licenses: ${blockedLicenses.join(", ")}`);
}
