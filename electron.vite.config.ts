import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
    // Standard (TC39) decorators aren't in any engine yet, so esbuild lowers them.
    esbuild: { target: "es2022" },
  },
});
