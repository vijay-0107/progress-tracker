import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CORE_TRACK_IDS, TRACK_IDS } from "../src/domain/types";

const script = path.resolve("scripts", "import-curriculum.mjs");
const source = path.resolve("src", "content", "tracks");

describe("append-only curriculum import provenance", () => {
  it("imports one optional topic without discarding original or other topic provenance", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "progress-curriculum-"),
    );
    try {
      fs.mkdirSync(path.join(directory, "public"));
      const before = JSON.parse(
        fs.readFileSync(
          path.resolve("public", "curriculum-provenance.json"),
          "utf8",
        ),
      );
      fs.writeFileSync(
        path.join(directory, "public", "curriculum-provenance.json"),
        JSON.stringify(before),
      );
      const result = spawnSync(
        process.execPath,
        [script, "--from", source, "--track", "ethical-hacking"],
        { cwd: directory, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const after = JSON.parse(
        fs.readFileSync(
          path.join(directory, "public", "curriculum-provenance.json"),
          "utf8",
        ),
      );
      expect(after.version).toBe("2026.09.21.1");
      expect(after.complete).toBe(true);
      expect(
        after.tracks.map((track: { trackId: string }) => track.trackId),
      ).toEqual([...TRACK_IDS]);
      for (const id of CORE_TRACK_IDS) {
        expect(
          after.tracks.find(
            (track: { trackId: string }) => track.trackId === id,
          ),
        ).toEqual(
          before.tracks.find(
            (track: { trackId: string }) => track.trackId === id,
          ),
        );
      }
      expect(
        after.tracks.find(
          (track: { trackId: string }) => track.trackId === "ethical-hacking",
        ).group,
      ).toBe("extra");
      expect(
        fs.readdirSync(path.join(directory, "src", "content", "tracks")),
      ).toEqual(["ethical-hacking.json"]);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
