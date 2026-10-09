import { features } from "./architecture.mjs";

const names = Object.keys(features);
/** A package or app: `packages/core/`, `apps/desktop/`. */
const PKG = "^(?:apps|packages)/[^/]+/";
/** A feature's folder, in any package or app: `packages/core/src/features/boards/`. */
const feature = (name) => `${PKG}.*/features/${name}/`;
/** A feature's entry points: `index.ts` (its React API, or its views) and `core/index.ts` (its core API). */
const ENTRY = "/features/[^/]+/(?:core/)?index\\.tsx?$";

/**
 * Import rules for the whole workspace, generated from architecture.mjs. Type-only imports count too
 * (tsPreCompilationDeps), so a cycle through interfaces is still a cycle.
 *
 * Two independent sets: feature edges (which feature may use which, wherever each lives) and layers
 * (what each package may use: the core runs everywhere, views are per platform, packages never know
 * the apps).
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
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment:
        "Every import resolves. A package can only use what its package.json lists, so this is also how a layer's npm dependencies are checked.",
      from: {},
      to: { couldNotResolve: true },
    },

    // Feature edges.
    ...Object.entries(features).map(([name, allowed]) => ({
      name: `feature-edges:${name}`,
      severity: "error",
      comment: `The ${name} feature may only depend on: ${allowed.join(", ") || "no other feature"}. Edges are declared in architecture.mjs.`,
      from: { path: feature(name) },
      to: { path: feature("[^/]+"), pathNot: feature(`(?:${[name, ...allowed].join("|")})`) },
    })),
    {
      name: "unknown-feature",
      severity: "error",
      comment: "Every feature folder must be declared in architecture.mjs.",
      from: { path: `${PKG}.*/features/(?!(?:${names.join("|")})/)` },
      to: {},
    },
    {
      name: "public-api-only",
      severity: "error",
      comment: "Code outside a feature imports it through index.ts or core/index.ts, never its internals.",
      from: { path: `(${PKG}).*/features/([^/]+)/` },
      to: { path: feature("[^/]+"), pathNot: [ENTRY, "$1.*/features/$2/"] },
    },
    {
      name: "public-api-only:app",
      severity: "error",
      comment: "An app's composition root and shell import features through index.ts or core/index.ts, never their internals.",
      from: { path: PKG, pathNot: "/features/" },
      to: { path: feature("[^/]+"), pathNot: ENTRY },
    },
    {
      name: "packages-by-name",
      severity: "error",
      comment:
        "Another package is imported by its name (@state-demo/…), so its exports map is its public API; never by a relative path into it.",
      from: { path: `(${PKG})` },
      to: { dependencyTypes: ["local"], path: "^(?:apps|packages)/", pathNot: "^$1" },
    },

    // Layers.
    {
      name: "packages-dont-import-apps",
      severity: "error",
      comment: "Packages are shared by every app, so they can't depend on one.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "universal-packages-have-no-views",
      severity: "error",
      comment: "The core, the API and the fake server run on every platform, so they can't use a platform's views.",
      from: { path: "^packages/(?:core|api|fake-server)/" },
      to: { path: "^packages/ui-" },
    },
    {
      name: "views-are-per-platform",
      severity: "error",
      comment: "DOM views and native views are siblings: neither uses the other.",
      from: { path: "^packages/ui-(dom|native)/" },
      to: { path: "^packages/ui-", pathNot: "^packages/ui-$1/" },
    },
    {
      name: "core-uses-cores",
      severity: "error",
      comment: "A feature's core has no React, so it may only use other features' cores and the platform core.",
      from: { path: "/features/[^/]+/core/" },
      to: { path: ["/features/[^/]+/(?!core/)", "/platform/(?!core/)"] },
    },
    {
      name: "platform-core-is-react-free",
      severity: "error",
      comment: "The platform core is shared by every feature's core, so it can't use the React platform.",
      from: { path: "/platform/core/" },
      to: { path: "/platform/(?!core/)" },
    },
    {
      name: "platform-is-a-leaf",
      severity: "error",
      comment: "The platform and the presentational components are shared by every feature, so they can't depend on any of them.",
      from: { path: ["^packages/core/src/platform/", "^packages/ui-[^/]+/src/ui/"] },
      to: { path: ["/features/", "/app/", "/shell/"] },
    },
    {
      name: "features-dont-import-the-app",
      severity: "error",
      comment: "Only an app's composition root and shell know every feature.",
      from: { path: "/features/" },
      to: { path: `${PKG}.*/(?:app|shell)/` },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["node_modules", "/out/", "/dist/", "\\.config\\.", "/\\.expo/"] },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".d.ts"],
    },
  },
};
