import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const [trackId, resourceId, filename] = process.argv.slice(2);
if (
  !/^(foundation|data|sde|quant|ai|gate|cat)$/.test(trackId || "") ||
  !resourceId ||
  !/^[a-z0-9-]+\.pdf$/.test(filename || "")
) {
  throw new Error(
    "Usage: node scripts/host-book.mjs <track> <approved-resource-id> <lowercase-filename.pdf>",
  );
}
const data = JSON.parse(
  await readFile(
    path.join("src", "content", "tracks", `${trackId}.json`),
    "utf8",
  ),
);
const resource = data.resources.find((item) => item.id === resourceId);
if (
  !resource ||
  resource.kind !== "book" ||
  resource.redistribution !== "permitted" ||
  !resource.licenseUrl ||
  !resource.downloadUrl ||
  !resource.license ||
  !resource.provider
) {
  throw new Error(
    "Only a researched book with affirmative redistribution rights, license evidence, attribution and an official PDF download may be hosted.",
  );
}
const manifestPath = path.join("src", "content", "hosted-books.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.some((item) => item.path === `books/${filename}`))
  throw new Error(
    "This asset already exists in the manifest; do not silently replace a pinned book edition.",
  );
const fileIndex = process.argv.indexOf("--source-file");
const hashIndex = process.argv.indexOf("--sha256");
let bytes;
let fetchedFrom = resource.downloadUrl;
if (fileIndex !== -1) {
  if (
    hashIndex === -1 ||
    !/^[a-f0-9]{64}$/i.test(process.argv[hashIndex + 1] || "")
  )
    throw new Error(
      "An inspected source file requires its independently recorded SHA-256.",
    );
  bytes = await readFile(process.argv[fileIndex + 1]);
  if (
    createHash("sha256").update(bytes).digest("hex") !==
    process.argv[hashIndex + 1].toLowerCase()
  )
    throw new Error(
      "The inspected PDF does not match its recorded original checksum.",
    );
} else {
  const response = await fetch(resource.downloadUrl, {
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok)
    throw new Error(`Official book download failed: HTTP ${response.status}`);
  const size = Number(response.headers.get("content-length") || 0);
  if (size > 50_000_000)
    throw new Error(
      "This PDF exceeds the 50 MB per-book budget. Keep an official link instead.",
    );
  bytes = Buffer.from(await response.arrayBuffer());
  fetchedFrom = response.url;
}
if (bytes.length > 50_000_000 || bytes.subarray(0, 5).toString() !== "%PDF-")
  throw new Error("Download is not a bounded, valid PDF asset.");
if (
  manifest.reduce((sum, book) => sum + book.bytes, 0) + bytes.length >
  100_000_000
)
  throw new Error(
    "Hosting this book would exceed the explicit 100 MB book inventory budget.",
  );
const entry = {
  title: resource.title,
  author: resource.provider,
  resourceId,
  originalUrl: resource.url,
  downloadUrl: resource.downloadUrl,
  fetchedFrom,
  license: resource.license,
  licenseUrl: resource.licenseUrl,
  sourceCheckedOn: resource.verifiedOn,
  downloadedAt: new Date().toISOString(),
  path: `books/${filename}`,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  changes:
    "Unmodified author/publisher PDF. No book chapters or solutions were copied into the lesson text.",
};
await mkdir(path.join("public", "books"), { recursive: true });
await writeFile(path.join("public", "books", filename), bytes);
const next = [...manifest, entry];
await writeFile(manifestPath, JSON.stringify(next, null, 2) + "\n");
await writeFile(
  path.join("public", "books", "manifest.json"),
  JSON.stringify(next, null, 2) + "\n",
);
const attribution = [
  "# Hosted book attribution",
  "",
  "These are unmodified, lawfully redistributable author/publisher PDFs. A free download alone was not treated as redistribution permission. Respect the cited licenses, including attribution, noncommercial and share-alike terms where applicable. The original PDFs retain their supplied copyright, attribution, third-party credits and license notices. No endorsement is implied and no additional restrictions or DRM are applied.",
  "",
  ...next.flatMap((book) => [
    `## ${book.title}`,
    "",
    `- Author/publisher: ${book.author}`,
    `- Original source: ${book.originalUrl}`,
    `- License: ${book.license}`,
    `- Permission evidence: ${book.licenseUrl}`,
    ...(book.licenseTextPath
      ? [`- Retained license text: ${book.licenseTextPath}`]
      : []),
    `- Local file: ${book.path}`,
    `- Changes: ${book.changes}`,
    `- SHA-256: \`${book.sha256}\``,
    ...(book.resourceId === "data-book-dbdesign"
      ? [
          "- Database Design - 2nd Edition by Adrienne Watt and Nelson Eng is used under a CC BY 4.0 International Licence. Copyright 2014 Adrienne Watt and Nelson Eng.",
          "- Download for free from the B.C. Open Collection: https://collection.bccampus.ca/",
          "- Original cover: Spiral Stairs In Milano old building downtown by Michele Ursino, CC BY-SA 2.0 Generic. The unchanged PDF retains the cover credit, link, original copyright page, and chapter-specific third-party attributions.",
        ]
      : []),
    "",
  ]),
].join("\n");
await writeFile(path.join("public", "books", "ATTRIBUTION.md"), attribution);
console.log(
  `Hosted ${resource.title}: ${(bytes.length / 1_000_000).toFixed(2)} MB, pinned SHA-256, original license and attribution retained.`,
);
