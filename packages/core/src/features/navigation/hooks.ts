import { createFeatureContext } from "../../platform/react/featureContext";
import { selectFrom } from "../../platform/react/select";
import type { Navigation, View } from "./core";

const [NavigationProvider, useNavigation] = createFeatureContext<Navigation>("navigation");
export { NavigationProvider };

function useLocationStore() {
  return useNavigation().store;
}
const select = selectFrom(useLocationStore);

export const useView = select((s) => s.view);
export const useIsView = select((s, view: View) => s.view === view);
/** The board the user picked; it may no longer exist (see the shell's `currentBoardId`). */
export const useChosenBoardId = select((s) => s.boardId);
export const useSelectedCardId = select((s) => s.selectedCardId);
export const useChatOpen = select((s) => s.chatOpen);
/** Whether this card is the open one. Only the two cards whose answer changes re-render. */
export const useIsSelectedCard = select((s, cardId: string) => s.selectedCardId === cardId);

export function useNavigationActions(): Navigation["store"]["actions"] {
  return useNavigation().store.actions;
}
