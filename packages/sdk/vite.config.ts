import { defineConfig } from "vite-plus";
import pkg from "./package.json";

const define = { PKG_VERSION: JSON.stringify(pkg.version) };

// CI restores the task cache across runs, so keep per-install state out of
// the fingerprints: pnpm rewrites node_modules/.modules.yaml on every install,
// and Vitest reads its own results cache under node_modules/.vite. Neither
// changes what vp pack or vp test produce.
const TRACK_INPUTS = [
  { auto: true },
  { pattern: "!node_modules/.modules.yaml", base: "workspace" as const },
];
const TEST_INPUTS = [...TRACK_INPUTS, "!node_modules/.vite/**"];

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
      build: { command: "vp pack", cache: { input: TRACK_INPUTS } },
      dev: { command: "vp pack --watch", cache: false },
      typecheck: "tsc --noEmit",
      test: { command: "vp test run", cache: { input: TEST_INPUTS } },
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
