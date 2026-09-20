import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/content/hosted-books.json";

interface HostedAsset {
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  originalUrl: string;
  downloadUrl: string;
  path: string;
  sha256: string;
  bytes: number;
  licenseTextPath?: string;
}

describe("licensed, pinned book assets", () => {
  it("ships an explicitly licensed integrated-reading inventory with attribution", () => {
    const assets: HostedAsset[] = manifest;
    expect(assets.length).toBeGreaterThan(0);
    expect(new Set(assets.map((asset) => asset.path)).size).toBe(assets.length);
    const attribution = fs.readFileSync(
      path.resolve("public", "books", "ATTRIBUTION.md"),
      "utf8",
    );
    for (const asset of assets) {
      expect(asset.licenseUrl).toMatch(/^https:\/\//);
      expect(asset.originalUrl).toMatch(/^https:\/\//);
      expect(asset.license).not.toMatch(/unknown|link-only/i);
      expect(attribution).toContain(asset.author);
      expect(attribution).toContain(asset.licenseUrl);
      const bytes = fs.readFileSync(
        path.resolve("public", ...asset.path.split("/")),
      );
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.length).toBeLessThanOrEqual(50_000_000);
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        asset.sha256,
      );
      if (asset.licenseTextPath)
        expect(
          fs.readFileSync(
            path.resolve("public", ...asset.licenseTextPath.split("/")),
            "utf8",
          ),
        ).toContain("Creative Commons");
    }
    expect(
      JSON.parse(
        fs.readFileSync(
          path.resolve("public", "books", "manifest.json"),
          "utf8",
        ),
      ),
    ).toEqual(manifest);
    expect(assets.reduce((sum, item) => sum + item.bytes, 0)).toBeLessThan(
      100_000_000,
    );
  });
});
