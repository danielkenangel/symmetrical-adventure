/**
 * The globals universal code may use: the ones every target has (a browser, React Native's Hermes,
 * Node). Packages that run everywhere check against this instead of the DOM or Node types, so
 * `window`, `document` or `process` fail to type-check there.
 */

declare function setTimeout(handler: () => void, ms?: number): number;
declare function clearTimeout(handle: number | undefined): void;
declare function setInterval(handler: () => void, ms?: number): number;
declare function clearInterval(handle: number | undefined): void;
declare function requestAnimationFrame(callback: (time: number) => void): number;
declare function cancelAnimationFrame(handle: number): void;
declare function queueMicrotask(callback: () => void): void;

declare const console: {
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};
