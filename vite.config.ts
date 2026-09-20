import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { unlink } from "node:fs/promises";
import path from "node:path";

let outputDirectory = "dist";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "omit-local-firebase-config",
      apply: "build",
      configResolved(config) {
        outputDirectory = config.build.outDir;
      },
      async closeBundle() {
        try {
          await unlink(
            path.resolve(outputDirectory, "firebase-config.local.js"),
          );
        } catch (error) {
          if (!(
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ))
            throw error;
        }
      },
    },
  ],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    watch: {
      ignored: [
        /[/\\]public[/\\]books[/\\]/,
        /[/\\]\.(?:e2e|qa)-preview[/\\]/,
        /[/\\]test-results[/\\]/,
        /[/\\]playwright-report[/\\]/,
      ],
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-dom/client"],
          "firebase-app": ["firebase/app"],
          "firebase-auth": ["firebase/auth"],
          "firebase-store": ["firebase/firestore"],
        },
      },
    },
  },
});
