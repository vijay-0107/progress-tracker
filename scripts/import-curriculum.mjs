import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const argument = process.argv.indexOf("--from");
if (argument === -1 || !process.argv[argument + 1]) {
  throw new Error(
    "Supply --from with the approved research handoff directory.",
  );
}
const source = path.resolve(process.argv[argument + 1]);
const coreTracks = ["foundation", "data", "sde", "quant", "ai", "gate", "cat"];
const extraTopics = [
  "trading",
  "algorithmic-trading",
  "finance",
  "computer-security-systems",
  "ethical-hacking",
];
const allTracks = [...coreTracks, ...extraTopics];
const selectedIndex = process.argv.indexOf("--track");
const tracks =
  selectedIndex === -1 ? coreTracks : [process.argv[selectedIndex + 1]];
if (tracks.some((track) => !allTracks.includes(track)))
  throw new Error("Unknown track selection.");

function publicMetadata(value) {
  if (typeof value === "string") {
    return value
      .replace(/\bMAQ\/client\b/g, "employer/client")
      .replace(
        / Historical (?:December 2023|March 2022) completion is user-reported;[^.]*\./g,
        "",
      )
      .replace(
        "the parent's SDE source families",
        "specialist SDE source families",
      )
      .replace(
        "Prior Python, SQL, PySpark and Fabric job exposure",
        "Prior exposure to tools",
      );
  }
  if (Array.isArray(value)) return value.map(publicMetadata);
  if (value && typeof value === "object") {
    const privateKeys = new Set([
      "localPath",
      "targetPath",
      "intendedArtifactPath",
      "artifactStatus",
      "fileWritten",
    ]);
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !privateKeys.has(key))
        .map(([key, item]) => [key, publicMetadata(item)]),
    );
  }
  return value;
}

function adaptSources(data, track) {
  return data.sources.flatMap((entry) => {
    if (!entry.url && entry.localPath) return [];
    if (entry.url) {
      return [
        {
          ...entry,
          title:
            entry.title ||
            `${entry.publisher || "Research source"}: ${entry.locator || entry.id}`,
        },
      ];
    }
    if (!Array.isArray(entry.resourceIds) || !entry.resourceIds.length) {
      throw new Error(
        `${track}: a source note has no URL or resource references.`,
      );
    }
    return entry.resourceIds.map((id) => {
      const resource = data.resources.find((item) => item.id === id);
      if (!resource)
        throw new Error(
          `${track}: source note refers to unknown resource ${id}`,
        );
      return {
        ...entry,
        sourceGroupId: entry.id,
        id: `${entry.id}-${id}`,
        title: resource.title,
        url: resource.url,
      };
    });
  });
}

const provenancePath = path.join("public", "curriculum-provenance.json");
let previousTracks = [];
try {
  const previous = JSON.parse(await readFile(provenancePath, "utf8"));
  if (!Array.isArray(previous.tracks))
    throw new Error("Existing curriculum provenance has no track inventory.");
  previousTracks = previous.tracks;
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  )
    throw error;
}

const inputs = await Promise.all(
  tracks.map(async (track) => {
    const original = (
      await readFile(path.join(source, `${track}.json`), "utf8")
    ).replace(/^\uFEFF/, "");
    const data = JSON.parse(original);
    if (
      data.trackId !== track ||
      data.schemaVersion !== 1 ||
      !Array.isArray(data.modules) ||
      !data.modules.length
    ) {
      throw new Error(`${track} is not a complete research handoff.`);
    }
    const { handoff: _handoff, validation: _validation, ...content } = data;
    content.limitations = data.limitations
      .filter(
        (item) =>
          !/^No cat\.json file was written;/i.test(item) &&
          !/expired DP-100/i.test(item) &&
          !/^The parent must persist and parse|^No exam registration, application, payment, repository edit or account change was performed\.|^The supplied brief identifies A projects as user-reported completed college work/i.test(
            item,
          ),
      )
      .map((item) =>
        item
          .replace(
            / No repo, account, shared browser tab or actual learner project was modified or implemented by this content-curation task\./,
            "",
          )
          .replace(/ No shared Playwright session was used\./, ""),
      );
    content.sources = adaptSources(data, track);
    if (track === "gate") content.title = "GATE: CS/IT and Data Science & AI";
    if (track === "sde") {
      const electives = new Set([
        "sde-l25-fullstack",
        "sde-l26-platform",
        "sde-l27-lexical-search",
        "sde-l28-rerank-evaluation",
      ]);
      content.modules = content.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          optional: electives.has(lesson.id),
        })),
      }));
    }
    const learnerData = publicMetadata(content);
    const text = JSON.stringify(learnerData, null, 2) + "\n";
    if (/copilot-worktrees|\\\\Users\\\\|\.copilot\\\\/.test(text)) {
      throw new Error(
        `${track} still contains a private operational path. Inspect rather than publishing it.`,
      );
    }
    return {
      track,
      text,
      data: learnerData,
      originalSha256: createHash("sha256").update(original).digest("hex"),
      packagedSha256: createHash("sha256").update(text).digest("hex"),
    };
  }),
);

await mkdir(path.join("src", "content", "tracks"), { recursive: true });
for (const input of inputs) {
  await writeFile(
    path.join("src", "content", "tracks", `${input.track}.json`),
    input.text,
  );
}
const provenance = new Map(
  previousTracks.map((track) => [track.trackId, track]),
);
for (const { track, data, originalSha256, packagedSha256 } of inputs) {
  provenance.set(track, {
    trackId: track,
    group: extraTopics.includes(track) ? "extra" : "core",
    sourceCheckedOn: data.sourceCheckedOn,
    modules: data.modules.length,
    lessons: data.modules.reduce(
      (total, module) => total + module.lessons.length,
      0,
    ),
    originalSha256,
    packagedSha256,
  });
}
await mkdir("public", { recursive: true });
await writeFile(
  provenancePath,
  JSON.stringify(
    {
      version: "2026.09.21.1",
      description:
        "Original core research provenance is retained. Extra Topics are optional, original learning curricula with externally linked sources and original assessments. Private history and transport-only metadata are omitted. Checksums identify source and packaged files, not source availability, redistribution permission, certification or mastery.",
      complete: allTracks.every((track) => provenance.has(track)),
      tracks: allTracks.flatMap((track) =>
        provenance.has(track) ? [provenance.get(track)] : [],
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Imported ${inputs.length} handoffs without modifying the research originals; unselected provenance is preserved. All seven core paths and five optional topics must pass content checks before publishing.`,
);
