import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import local from "./lint/index.mjs";

const CORE = ["src/renderer/src/features/*/core/**/*.ts", "src/renderer/src/platform/core/**/*.ts"];

export default defineConfig(
  { ignores: ["out", "dist", "node_modules"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, local },
    rules: {
      // The hook rules and the React Compiler's rules. A component the compiler bails out on falls
      // back to plain re-renders with no visible sign, so every rule is an error.
      ...reactHooks.configs.flat["recommended-latest"].rules,
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/incompatible-library": "error",
      "react-hooks/unsupported-syntax": "error",
      "react-hooks/todo": "error",
      "local/no-app-deps": ["error", { forbidden: ["ComposedApp"] }],
    },
  },
  {
    // The core: plain TypeScript that React depends on, never the reverse.
    files: CORE,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "The core has no React. React depends on the core, not the reverse." },
            { name: "react-dom", message: "The core has no React." },
            { name: "@tanstack/react-query", message: "Use @tanstack/query-core in the core." },
            { name: "zustand", message: "Use zustand/vanilla in the core; hooks live in the feature's hooks." },
            { name: "zustand/traditional", message: "Use zustand/vanilla in the core." },
            { name: "zustand/shallow", message: "Use zustand/vanilla/shallow in the core." },
          ],
        },
      ],
      // Every subscription's unsubscribe is kept: added to a Disposer or returned.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExpressionStatement > CallExpression[callee.property.name='subscribe']",
          message: "Keep the unsubscribe: disposer.add(x.subscribe(…)), or return it.",
        },
      ],
    },
  },
  {
    // Presentational components take plain values and never import a feature.
    files: ["src/renderer/src/platform/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/features/**", "**/app/**"], message: "ui/ components take plain values." }] }],
    },
  },
  {
    files: ["lint/**/*.mjs", "*.config.{ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
);
