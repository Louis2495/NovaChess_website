import { useEffect, useRef } from "react";
import { useApp } from "./context";
export const defaultControls = {
  flip: "f",
  previous: "ArrowLeft",
  next: "ArrowRight",
  first: "Home",
  last: "End",
  autoplay: " ",
  clearMarks: "Escape",
  mark: "none",
  markBlue: "shift",
  markRed: "alt",
  markGold: "ctrl",
};
export type ControlAction = keyof typeof defaultControls;
export function useControl(action: ControlAction, fn: () => void) {
  const { appearance } = useApp();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]",
        )
      )
        return;
      const key = appearance.controls?.[action] ?? defaultControls[action];
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [appearance.controls, action]);
}
