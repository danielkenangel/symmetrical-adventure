/**
 * The feature graph: the one place dependencies between features are declared.
 *
 * A feature may import the platform, shared code, and the features listed here, through their
 * index.ts only. Adding an edge is a reviewed change to this file; dependency-cruiser rejects any
 * import that isn't listed (see .dependency-cruiser.mjs). Like a language that refuses import
 * cycles unless you opt in, a cycle between features also needs an entry in `allowedCycles`, and
 * a runtime back-edge (a Lazy<T> dependency) needs its file in `lazyDependencies`, each with a reason.
 */
export const features = {
  navigation: [],
  boards: [],
  cards: ["boards"],
  server: [],
  shell: ["navigation", "boards", "cards", "server"],
};

/** @type {Array<{ between: [string, string]; reason: string }>} */
export const allowedCycles = [];

/** @type {Array<{ file: string; reason: string }>} Files (relative to the repo root) allowed to declare Lazy<T> dependencies. */
export const lazyDependencies = [];
