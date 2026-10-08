import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // The React Compiler memoizes components and hooks, so the code has no hand-written useMemo or
    // useCallback.
    plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
  },
});
