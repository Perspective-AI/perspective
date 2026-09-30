import { defineConfig } from "vite-plus";

// Workspace dependencies (@perspective-ai/sdk) resolve through their built
// dist/, so build them before anything that imports them.
const buildDeps = [{ task: "build", from: "dependencies" as const }];

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
  pack: {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    // Keep .js/.d.ts (ESM) and .cjs/.d.cts (CJS) to match `exports`;
    // tsdown defaults to .mjs/.d.mts on the node platform.
    fixedExtension: false,
    dts: true,
    sourcemap: true,
    target: "es2020",
    treeshake: true,
    // src/index.ts starts with "use client"; rolldown keeps it at the top of
    // the single-entry output but still warns that it might not.
    checks: { moduleLevelDirective: false },
    deps: {
      neverBundle: ["react", "react-dom", "@perspective-ai/sdk"],
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  run: {
    tasks: {
      build: {
        command: "vp pack",
        dependsOn: buildDeps,
        cache: { input: TRACK_INPUTS },
      },
      dev: { command: "vp pack --watch", cache: false },
      typecheck: { command: "tsc --noEmit", dependsOn: buildDeps },
      test: {
        command: "vp test run",
        dependsOn: buildDeps,
        cache: { input: TEST_INPUTS },
      },
    },
  },
});
