import noAppDeps from "./rules/no-app-deps.mjs";

/** The demo's own rules, used as the `local/` plugin in eslint.config.mjs. */
export default {
  rules: {
    "no-app-deps": noAppDeps,
  },
};
