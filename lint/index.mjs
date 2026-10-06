import actionNaming from "./rules/action-naming.mjs";
import narrowDeps from "./rules/narrow-deps.mjs";

/** The demo's own rules, used as the `local/` plugin in eslint.config.mjs. */
export default {
  rules: {
    "action-naming": actionNaming,
    "narrow-deps": narrowDeps,
  },
};
