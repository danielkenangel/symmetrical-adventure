/**
 * The feature graph: the one place dependencies between features are declared.
 *
 * A feature is a `features/<name>/` folder, and the name is its identity in every package and app:
 * `packages/core/src/features/boards/` (its core and hooks), `packages/ui-dom/src/features/boards/`
 * (its DOM views) and `packages/ui-native/src/features/boards/` (its native views) are one feature.
 * Any of them may import the others, and the features listed here, from any package. A feature that
 * only one app has lives in that app (`apps/desktop/.../features/server/`) and is declared here too.
 *
 * Adding an edge is a reviewed change to this file; dependency-cruiser rejects any import that
 * isn't listed, and any cycle (see .dependency-cruiser.mjs).
 */
export const features = {
  navigation: [],
  cards: [],
  boards: ["cards", "navigation"],
  chat: [],
  title: ["boards", "navigation"],
  server: [],
};
