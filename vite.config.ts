import { defineConfig } from "vite-plus";

// Established internal names: `_apiConfig`/`_apiConfigPending` cross the
// sdk/sdk-react boundary, and the global guards against double init.
const UNDERSCORE_NAMES = [
  "_apiConfig",
  "_apiConfigPending",
  "__PERSPECTIVE_SDK_INITIALIZED__",
];

export default defineConfig({
  lint: {
    plugins: ["unicorn", "typescript", "oxc"],
    // Fail on Oxlint's correctness, suspicious and perf categories (the
    // previous per-rule list was the correctness set at "warn").
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
    },
    rules: {
      "no-underscore-dangle": ["error", { allow: UNDERSCORE_NAMES }],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["packages/sdk-react/**"],
        plugins: ["react"],
        rules: {
          // sdk-react compiles JSX with the automatic runtime ("react-jsx").
          "react/react-in-jsx-scope": "off",
        },
      },
      {
        files: ["**/*.test.ts", "**/*.test.tsx", "packages/sdk/e2e/**"],
        rules: {
          // Test doubles and DOM fixtures narrow types with `as` casts.
          "typescript/no-unsafe-type-assertion": "off",
        },
      },
      {
        files: ["packages/sdk/e2e/**"],
        rules: {
          // The e2e fixtures record events on window.__testEvents.
          "no-underscore-dangle": [
            "error",
            { allow: [...UNDERSCORE_NAMES, "__testEvents"] },
          ],
        },
      },
    ],
    ignorePatterns: [
      "node_modules",
      "dist",
      "coverage",
      "test-results",
      "playwright-report",
    ],
    // Type-aware rules and the type check resolve @perspective-ai/sdk through
    // its built dist/, so build before linting: CI and the pre-commit hook do,
    // and `pnpm check` runs `pnpm typecheck` (which builds) first.
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,md,yml,yaml}": "vp check --fix",
  },
  fmt: {
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "lf",
    sortPackageJson: false,
    ignorePatterns: [
      "node_modules",
      "dist",
      "coverage",
      "test-results",
      "playwright-report",
      "*.d.ts",
      "pnpm-lock.yaml",
      ".changeset/*.md",
    ],
  },
});
