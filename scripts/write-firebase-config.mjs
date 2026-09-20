import { readFile, writeFile } from "node:fs/promises";

const fields = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  appId: "FIREBASE_APP_ID",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  measurementId: "FIREBASE_MEASUREMENT_ID",
};
const sourceIndex = process.argv.indexOf("--from");
const supplied =
  sourceIndex === -1
    ? null
    : JSON.parse(await readFile(process.argv[sourceIndex + 1], "utf8"));
const source = supplied?.firebaseConfig || supplied;
const config = Object.fromEntries(
  Object.entries(fields).map(([field, variable]) => [
    field,
    source
      ? typeof source[field] === "string"
        ? source[field]
        : ""
      : process.env[variable] || "",
  ]),
);
const required = ["apiKey", "authDomain", "projectId", "appId"];
const missing = required.filter((field) => !config[field]);
if (missing.length)
  throw new Error(`Missing Firebase environment values: ${missing.join(", ")}`);
const local = process.argv.includes("--local");
const output = local
  ? "public/firebase-config.local.js"
  : "public/firebase-config.js";
await writeFile(
  output,
  `export const firebaseConfig = ${JSON.stringify(config, null, 2)};\n`,
);
console.log(
  local
    ? "Generated ignored local Firebase runtime configuration."
    : "Generated deployment Firebase runtime configuration; do not commit the populated file.",
);
