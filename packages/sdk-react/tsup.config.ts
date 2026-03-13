import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  target: "es2020",
  clean: true,
  external: ["react", "react-dom", "@perspective-ai/sdk"],
  treeshake: true,
});
