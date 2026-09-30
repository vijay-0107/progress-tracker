import { build, preview } from "vite";

process.env.VITE_USE_EMULATORS =
  process.env.E2E_EMULATORS === "true" ? "true" : "false";
process.env.VITE_BUILD_SHA = "e2e-snapshot";
const outDir = ".e2e-preview";
const port = Number(process.env.E2E_PORT || "5199");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("E2E_PORT must be an integer between 1024 and 65535.");
await build({ base: "/progress-tracker/", build: { outDir } });
const server = await preview({
  base: "/progress-tracker/",
  build: { outDir },
  preview: { host: "127.0.0.1", port, strictPort: true },
});
server.printUrls();
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.httpServer.close(() => process.exit(0)));
}
