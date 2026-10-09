import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import local from "./lint/index.mjs";

const CORE = ["src/renderer/src/features/*/core/**/*.ts", "src/renderer/src/platform/core/**/*.ts"];

// Stores are made with defineStore and read with selectFrom; only those two files touch zustand.
const STORE_FILES = ["src/renderer/src/platform/core/defineStore.ts", "src/renderer/src/platform/react/select.ts"];
const STORE_PATTERNS = [
  { group: ["zustand", "zustand/*"], message: "Define stores with platform/core/defineStore and make hooks with platform/react/select." },
  { group: ["**/platform/core/defineStore"], importNames: ["STORE"], message: "Only platform/react/select reads the zustand store." },
];
// Every query is made with defineQuery, which checks that its data is JSON-safe.
const DEFINE_QUERY = {
  selector: ':not(CallExpression[callee.name="defineQuery"] > ObjectExpression) > Property[key.name="queryFn"]',
  message: "Make query options with platform/core/defineQuery, so the data is checked to be JSON-safe.",
};
const CORE_PATHS = [
  { name: "react", message: "The core has no React. React depends on the core, not the reverse." },
  { name: "react-dom", message: "The core has no React." },
  { name: "@tanstack/react-query", message: "Use @tanstack/query-core in the core." },
];

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
      "local/source-suffix": "error",
      "no-restricted-imports": ["error", { patterns: STORE_PATTERNS }],
      "no-restricted-syntax": ["error", DEFINE_QUERY],
    },
  },
  {
    // The core: plain TypeScript that React depends on, never the reverse.
    files: CORE,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: CORE_PATHS,
          patterns: STORE_PATTERNS,
        },
      ],
      // Every subscription's unsubscribe is kept: added to a Disposer or returned.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExpressionStatement > CallExpression[callee.property.name=/^(subscribe|watch)$/]",
          message: "Keep the unsubscribe: disposer.add(x.subscribe(…)), or return it.",
        },
        DEFINE_QUERY,
      ],
    },
  },
  {
    // Presentational components take plain values and never import a feature.
    files: ["src/renderer/src/platform/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/features/**", "**/app/**"], message: "ui/ components take plain values." }, ...STORE_PATTERNS] },
      ],
    },
  },
  {
    // The two store files: defineStore stays React-free, and select is the one reader of the store.
    files: STORE_FILES,
    rules: {
      "no-restricted-imports": ["error", { paths: CORE_PATHS }],
    },
  },
  {
    files: ["src/renderer/src/platform/react/select.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["lint/**/*.mjs", "*.config.{ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
);
