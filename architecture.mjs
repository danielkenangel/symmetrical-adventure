/**
 * The feature graph: the one place dependencies between features are declared.
 *
 * A feature may import the platform, shared code, and the features listed here. It imports another
 * feature through one of its two entry points: `index.ts` (its React API: providers, hooks, views)
 * or `core/index.ts` (its core API: no React). A feature's core may only use other features' cores.
 * Adding an edge is a reviewed change to this file; dependency-cruiser rejects any import that
 * isn't listed, and any cycle (see .dependency-cruiser.mjs).
 */
export const features = {
  navigation: [],
  cards: [],
  boards: ["cards", "navigation"],
  server: [],
  chat: [],
  shell: ["navigation", "boards", "server", "chat"],
};
