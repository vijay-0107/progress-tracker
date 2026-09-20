import { build, preview } from "vite";

process.env.VITE_USE_EMULATORS =
  process.env.E2E_EMULATORS === "true" ? "true" : "false";
process.env.VITE_BUILD_SHA = "e2e-snapshot";
const outDir = ".e2e-preview";
await build({ base: "/progress-tracker/", build: { outDir } });
const server = await preview({
  base: "/progress-tracker/",
  build: { outDir },
  preview: { host: "127.0.0.1", port: 5178, strictPort: true },
});
server.printUrls();
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.httpServer.close(() => process.exit(0)));
}
