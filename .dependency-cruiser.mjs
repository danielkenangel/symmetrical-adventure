import { features } from "./architecture.mjs";

const SRC = "^src/renderer/src";
const names = Object.keys(features);

/**
 * Import rules, generated from architecture.mjs. Type-only imports count too
 * (tsPreCompilationDeps), so a cycle through interfaces is still a cycle.
 *
 * @type {import("dependency-cruiser").IConfiguration}
 */
export default {
  forbidden: [
    {
      name: "no-cycles",
      severity: "error",
      comment: "Import cycles are errors.",
      from: {},
      to: { circular: true },
    },
    ...Object.entries(features).map(([name, allowed]) => ({
      name: `feature-edges:${name}`,
      severity: "error",
      comment: `The ${name} feature may only depend on: ${allowed.join(", ") || "no other feature"}. Edges are declared in architecture.mjs.`,
      from: { path: `${SRC}/features/${name}/` },
      to: { path: `${SRC}/features/`, pathNot: `${SRC}/features/(${[name, ...allowed].join("|")})/` },
    })),
    {
      name: "unknown-feature",
      severity: "error",
      comment: "Every feature folder must be declared in architecture.mjs.",
      from: { path: `${SRC}/features/(?!(${names.join("|")})/)` },
      to: {},
    },
    {
      name: "public-api-only",
      severity: "error",
      comment: "Other features and the app import a feature through index.ts (React API) or core/index.ts (core API), never its internals.",
      from: { path: `${SRC}/(app|features/([^/]+))/` },
      to: {
        path: `${SRC}/features/[^/]+/`,
        pathNot: [`${SRC}/features/[^/]+/index\\.ts$`, `${SRC}/features/[^/]+/core/index\\.ts$`, `${SRC}/features/$2/`],
      },
    },
    {
      name: "core-uses-cores",
      severity: "error",
      comment: "A feature's core has no React, so it may only use other features' cores and the platform core.",
      from: { path: `${SRC}/features/[^/]+/core/` },
      to: { path: [`${SRC}/features/[^/]+/(?!core/)`, `${SRC}/platform/(?!core/)`] },
    },
    {
      name: "platform-core-is-react-free",
      severity: "error",
      comment: "The platform core is shared by every feature's core, so it can't use the React platform.",
      from: { path: `${SRC}/platform/core/` },
      to: { path: `${SRC}/platform/(?!core/)` },
    },
    {
      name: "platform-is-a-leaf",
      severity: "error",
      comment: "The platform is shared by every feature, so it can't depend on any of them.",
      from: { path: `${SRC}/platform/` },
      to: { path: `${SRC}/(features|app)/` },
    },
    {
      name: "features-dont-import-the-app",
      severity: "error",
      comment: "Only the composition root knows every feature.",
      from: { path: `${SRC}/features/` },
      to: { path: `${SRC}/app/` },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
