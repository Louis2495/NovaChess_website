import { useEffect, useRef } from "react";
import { useApp } from "./context";
export const defaultControls = {
  flip: "f",
  focusMode: "z",
  newGame: "n",
  analysis: "a",
  home: "h",
  search: "/",
  previous: "ArrowLeft",
  next: "ArrowRight",
  first: "ArrowUp",
  last: "ArrowDown",
  autoplay: " ",
  clearMarks: "Escape",
  mark: "none",
  markBlue: "shift",
  markRed: "alt",
  markGold: "ctrl",
};
export type ControlAction = keyof typeof defaultControls;
export function resolveControls(overrides: Record<string, string> = {}) {
  overrides = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => key in defaultControls),
  );
  if (overrides.first === "Home") delete overrides.first;
  if (overrides.last === "End") delete overrides.last;
  const result: Record<string, string> = { ...defaultControls, ...overrides };
  for (const key of Object.keys(defaultControls)) {
    if (key in overrides || key.startsWith("mark")) continue;
    if (
      Object.entries(overrides).some(
        ([k, v]) =>
          !k.startsWith("mark") &&
          v &&
          v.toLowerCase() === result[key].toLowerCase(),
      )
    )
      result[key] = "";
  }
  return result;
}
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
      const key = resolveControls(appearance.controls)[action];
      if (
        key &&
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
