import { defineConfig } from "tsup";

export default defineConfig([
  // ESM + CJS for NPM (tree-shakeable, no side effects)
  {
    entry: {
      index: "src/index.ts",
      constants: "src/constants.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2020",
    clean: true,
    splitting: false,
    treeshake: true,
  },
  // Browser entry (has side effects: auto-init)
  {
    entry: { browser: "src/browser.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2020",
    splitting: false,
  },
  // IIFE for CDN
  {
    entry: { perspective: "src/browser.ts" },
    format: ["iife"],
    globalName: "Perspective",
    outDir: "dist/cdn",
    minify: true,
    sourcemap: true,
    target: ["es2020", "chrome80", "firefox80", "safari14"],
  },
]);
