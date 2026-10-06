import js from "@eslint/js";
import mobx from "eslint-plugin-mobx";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import local from "./lint/index.mjs";

/** The MobX guardrails from the RFC appendix (section 5g), applied for real. */
const mobxHygiene = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "ExpressionStatement > CallExpression[callee.name=/^(reaction|autorun|when)$/]",
      message: "Keep the disposer: disposer.add(reaction(…)).",
    },
    {
      selector: "MethodDefinition[value.async=true] > Decorator[expression.name='action']",
      message: "Actions are synchronous. Use a query or a mutation for async work.",
    },
    {
      selector: "CallExpression[callee.name='makeAutoObservable']",
      message: "Annotate explicitly.",
    },
  ],
  "local/action-naming": "error",
  "local/narrow-deps": ["error", { forbidden: ["AppRoot", "Session"] }],
};

export default defineConfig(
  { ignores: ["out", "dist", "node_modules"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { mobx, "react-hooks": reactHooks, local },
    rules: {
      ...mobx.flatConfigs.recommended.rules,
      // Assumes legacy decorators: standard (TC39) decorators don't need makeObservable(this).
      "mobx/missing-make-observable": "off",
      // Only connected views must be observers (below); ui/ components take plain values.
      "mobx/missing-observer": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...mobxHygiene,
    },
  },
  {
    // Connected components read models, so each one must be an observer.
    files: ["src/renderer/src/views/**/*.tsx"],
    rules: { "mobx/missing-observer": "error" },
  },
  {
    // Presentational components take plain values and never import a model.
    files: ["src/renderer/src/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/models/*", "**/app/*"], message: "ui/ components take plain values, never models." }] }],
    },
  },
  {
    files: ["lint/**/*.mjs", "*.config.{ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
);
