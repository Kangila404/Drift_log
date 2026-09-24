import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import {
  createVoyageNavigationController, readNavigationCapability,
  type VoyageNavigationCommand,
} from "../services/voyageNavigation";

export function useVoyageNavigation({ send, focused, hidden, initialized, voyageState }: {
  send: (command: VoyageNavigationCommand) => void;
  focused: boolean;
  hidden: boolean;
  initialized: boolean;
  voyageState?: string;
}) {
  const controller = useMemo(() => createVoyageNavigationController(send), [send]);
  const [capability, setCapability] = useState({ available: false, canSteer: false });
  const [active, setActive] = useState(AppState.currentState === "active");
  const visible = capability.available && focused && active && !hidden && initialized
    && (voyageState === "SAILING" || voyageState === "PAUSED");
  const canSteer = visible && capability.canSteer && voyageState === "SAILING";

  useLayoutEffect(() => {
    controller.setEnabled(visible, canSteer);
  }, [controller, visible, canSteer]);

  useEffect(() => {
    const change = AppState.addEventListener("change", (state) => {
      if (state !== "active") controller.setEnabled(false, false);
      setActive(state === "active");
    });
    // Android's notification shade can blur without changing AppState.
    const blur = AppState.addEventListener("blur", () => {
      controller.setEnabled(false, false);
      setActive(false);
    });
    const focus = AppState.addEventListener("focus", () => {
      setActive(AppState.currentState === "active");
    });
    return () => {
      change.remove();
      blur.remove();
      focus.remove();
      controller.setCapability(false, false);
    };
  }, [controller]);

  const invalidate = useCallback(() => {
    controller.setCapability(false, false);
    setCapability({ available: false, canSteer: false });
  }, [controller]);

  const receive = (message: unknown) => {
    const next = readNavigationCapability(message);
    if (next === null) return false;
    controller.setCapability(next.available, next.canSteer);
    setCapability(next);
    return true;
  };

  return { controller, visible, canSteer, invalidate, receive };
}
