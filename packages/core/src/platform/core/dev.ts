/**
 * Whether this is a development build. React Native defines `__DEV__`; the Vite apps set it from
 * `import.meta.env.DEV` before composing.
 */
export function isDev(): boolean {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}
