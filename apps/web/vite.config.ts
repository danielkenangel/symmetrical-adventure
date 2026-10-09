import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // The React Compiler memoizes components and hooks, including the shared packages' (they're
  // compiled from source, here).
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
  server: { port: 5180 },
  preview: { port: 5181 },
});
