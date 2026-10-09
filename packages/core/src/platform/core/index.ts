// The platform core, for features outside this package (an app's own features): no React.
export { defineQuery } from "./defineQuery";
export { defineStore } from "./defineStore";
export { Disposer, type Lifecycle } from "./lifecycle";
export { mutationOptions, runMutation } from "./mutations";
export { type KeyValueStorage } from "./storage";
