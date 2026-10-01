import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["unicorn", "typescript", "oxc", "react"],
    // Fail on Oxlint's correctness, suspicious and perf categories (the
    // previous per-rule list was the correctness set at "warn").
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
    },
    rules: {
      // The React packages use the automatic JSX runtime ("jsx": "react-jsx").
      "react/react-in-jsx-scope": "off",
      // DOM queries and test doubles narrow types with deliberate `as` casts.
      "typescript/no-unsafe-type-assertion": "off",
      // `_apiConfig` (internal config) and `__…__` globals are intentional.
      "no-underscore-dangle": "off",
      // tsconfig's noImplicitReturns already covers this, and the rule flags
      // React's `if (!x) return;` … `return cleanup;` effect idiom.
      "typescript/consistent-return": "off",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
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
