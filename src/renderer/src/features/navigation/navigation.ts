import { reaction } from "mobx";

import { createFeatureContext } from "../../platform/react";
import { AppLocation, parseLocation } from "./AppLocation";

export const LOCATION_STORAGE_KEY = "state-demo:location";

export interface NavigationDeps {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
}

export interface Navigation {
  readonly location: AppLocation;
  /** Saves the location whenever it changes. */
  start(): () => void;
}

export function createNavigation(deps: NavigationDeps): Navigation {
  const location = new AppLocation();
  const saved = parseLocation(deps.storage?.getItem(LOCATION_STORAGE_KEY) ?? null);
  if (saved) location.restoreAction(saved);
  return {
    location,
    start: () =>
      reaction(
        () => location.snapshot,
        (snapshot) => deps.storage?.setItem(LOCATION_STORAGE_KEY, JSON.stringify(snapshot)),
      ),
  };
}

export const [NavigationProvider, useNavigation] = createFeatureContext<Navigation>("navigation");
