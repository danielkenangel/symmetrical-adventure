import js from "@eslint/js";
import mobx from "eslint-plugin-mobx";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import { lazyDependencies } from "./architecture.mjs";
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
      // @action and @action.bound, on methods and on fields (`@action loadAction = async () => …`)
      selector:
        ":matches(MethodDefinition, PropertyDefinition)[value.async=true] > Decorator:matches([expression.name='action'], [expression.object.name='action'])",
      message: "Actions are synchronous. Use a query or a mutation for async work.",
    },
    {
      selector: "CallExpression[callee.name='observer'] > :matches(ArrowFunctionExpression, FunctionExpression[id=null])",
      message: "Name observer components, observer(function Name() { … }), so they show up in DevTools and profiles.",
    },
    {
      selector: "CallExpression[callee.name='makeAutoObservable']",
      message: "Annotate explicitly.",
    },
  ],
  "local/action-naming": "error",
  "local/narrow-deps": ["error", { forbidden: ["ComposedApp"] }],
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
    files: ["src/renderer/src/features/*/views/**/*.{ts,tsx}"],
    rules: { "mobx/missing-observer": "error" },
  },
  {
    // Presentational components take plain values and never import a feature.
    files: ["src/renderer/src/platform/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/features/**", "**/app/**"], message: "ui/ components take plain values, never models." }] }],
    },
  },
  ...(lazyDependencies.length
    ? [{ files: lazyDependencies.map(({ file }) => file), rules: { "local/narrow-deps": ["error", { forbidden: ["ComposedApp"], allowLazy: true }] } }]
    : []),
  {
    files: ["lint/**/*.mjs", "*.config.{ts,mjs}"],
    languageOptions: { globals: globals.node },
  },
);
