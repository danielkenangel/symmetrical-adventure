import { useStore } from "zustand";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { LocationState, Navigation } from "./core";

const [NavigationProvider, useNavigation] = createFeatureContext<Navigation>("navigation");
export { NavigationProvider };

/** A slice of where the user is. Re-renders only when the slice changes, so select narrowly. */
export function useLocation<T>(selector: (state: LocationState) => T): T {
  return useStore(useNavigation().store, selector);
}

/** Whether this card is the open one. Only the two cards whose answer changes re-render. */
export function useIsSelectedCard(cardId: string): boolean {
  return useLocation((s) => s.selectedCardId === cardId);
}

export function useNavigationActions(): Navigation {
  return useNavigation();
}
