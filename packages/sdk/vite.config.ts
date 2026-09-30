import { defineConfig } from "vite-plus";
import pkg from "./package.json";

const define = { PKG_VERSION: JSON.stringify(pkg.version) };

export default defineConfig({
  define,
  pack: [
    // ESM + CJS for NPM (tree-shakeable, no side effects)
    {
      entry: {
        index: "src/index.ts",
        constants: "src/constants.ts",
      },
      format: ["esm", "cjs"],
      // Keep .js/.d.ts (ESM) and .cjs/.d.cts (CJS) to match `exports`;
      // tsdown defaults to .mjs/.d.mts on the node platform.
      fixedExtension: false,
      dts: true,
      sourcemap: true,
      target: "es2020",
      treeshake: true,
      define,
    },
    // Browser entry (has side effects: auto-init)
    {
      entry: { browser: "src/browser.ts" },
      format: ["esm", "cjs"],
      fixedExtension: false,
      dts: true,
      sourcemap: true,
      target: "es2020",
      // Named + `default` exports, as before; silences MIXED_EXPORTS.
      outputOptions: { exports: "named" },
      define,
    },
    // IIFE for CDN
    {
      entry: { perspective: "src/browser.ts" },
      format: ["iife"],
      globalName: "Perspective",
      outDir: "dist/cdn",
      // The CDN bundle is published as dist/cdn/perspective.global.js;
      // tsdown would otherwise name it perspective.iife.js.
      outputOptions: { entryFileNames: "[name].global.js", exports: "named" },
      dts: false,
      minify: true,
      sourcemap: true,
      target: ["es2020", "chrome80", "firefox80", "safari14"],
      define,
    },
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
  run: {
    tasks: {
      build: "vp pack",
      dev: { command: "vp pack --watch", cache: false },
      typecheck: "tsc --noEmit",
      test: "vp test run",
      "test:e2e": {
        command: "playwright test",
        dependsOn: ["build"],
        cache: { untrackedEnv: ["PLAYWRIGHT_BROWSERS_PATH"] },
      },
      "test:ssr": {
        // Keep the command ASCII (vite-plus 1.0.0 can panic on multi-byte
        // characters in task commands); node prints the check mark instead.
        command:
          "node -e \"require('./dist/index.cjs'); require('./dist/constants.cjs'); console.log('SSR safe \\u2713')\"",
        dependsOn: ["build"],
      },
    },
  },
});
