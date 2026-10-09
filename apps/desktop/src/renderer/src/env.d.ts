import type { Api } from "@state-demo/api";

declare global {
  interface Window {
    api: Api;
  }
}
