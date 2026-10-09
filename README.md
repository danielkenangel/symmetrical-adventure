# State demo

```sh
pnpm install
pnpm dev               # desktop (Electron): every feature, the fake server in the main process
pnpm dev:web           # web (Vite, http://localhost:5180): the boards and their chat only
pnpm dev:mobile        # mobile (Expo): the same, in React Native views; press w for the web build
pnpm lint              # ESLint (hook and compiler rules, core rules), plus the architecture check (dependency-cruiser)
pnpm typecheck         # every package and app, each against its own platform's types
pnpm smoke             # desktop: build, run hidden, run a few interactions and log what each fetched;
                       # run twice to see the cached first paint
pnpm smoke:web         # web: build, drive it in Chrome, print what rendered and any console warnings
pnpm smoke:mobile-web  # mobile's React Native views on react-native-web, same steps
```

## Packages

One core for every app. Views split by platform.

- **api**: the server contract
- **fake-server**: mock backend; in Electron's main on desktop, in-process on web and mobile
- **core**: shared by every app; no DOM, no Node, no React Native
  - **platform/core**: stores, queries, writes, lifecycle, storage
  - **platform/react**: feature contexts, selectors, scoped stores
  - **features/\<name>**
    - **core**: state and logic, no React
    - **hooks**: React, no DOM
  - **app**: shared composition and providers
- **ui-dom**: desktop and web views
  - **ui**: primitives
  - **features/\<name>**
  - **styles.css**
- **ui-native**: mobile views
  - **ui**: primitives
  - **features/\<name>**

## Apps

Each app composes the shared features, adds its own, and owns its layout.

- **desktop**: Electron; everything
  - **main**: window, fake server over IPC, smoke test
  - **preload**: IPC bridge
  - **renderer**
    - **app**: shared features + title + server
    - **shell**: sidebar, board or settings, side panel
    - **features/server**: desktop-only feature
- **web**: Vite; boards and chat only
  - **app**: shared features + title
  - **shell**: board tabs, board, side panel
- **mobile**: Expo; same as web, React Native
  - **App**: shared features only
  - **shell**: board tabs, then one screen

## Features

A feature is a `features/<name>/` folder. Same name in every package = same feature.

- **Shared** (core, ui-dom, ui-native)
  - **navigation**: where the user is
  - **cards**: card data; tile, detail
  - **boards**: columns, filters, writes, live updates; board view
  - **chat**: per-board rooms, per-frame batching; chat panel
  - **title**: window or tab title; core only, desktop and web
- **Desktop only** (apps/desktop)
  - **server**: the fake server's knobs, in Settings

## Rules

Dependencies point one way: apps → views → core → api.

- **apps**: may use any package
- **ui-dom**: may use core, never ui-native
- **ui-native**: may use core, never ui-dom
- **core, api, fake-server**: never views or apps
  - **features/\<name>/core**: never React
- **packages**: never apps
- **features**: only the edges declared in architecture.mjs

Checked by TypeScript (no DOM in core), package.json (no undeclared imports), dependency-cruiser and ESLint.
