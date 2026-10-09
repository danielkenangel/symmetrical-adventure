import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// The workspace packages are TypeScript source, so main bundles them instead of requiring them.
const bundled = { externalizeDeps: { exclude: ["@state-demo/api", "@state-demo/fake-server"] } };

export default defineConfig({
  main: { build: bundled },
  preload: { build: bundled },
  renderer: {
    // The React Compiler memoizes components and hooks, including the shared packages' (they're
    // compiled from source, here).
    plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
  },
});
