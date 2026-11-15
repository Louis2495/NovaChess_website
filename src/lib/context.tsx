import { createContext, useContext } from "react";
import type { Appearance, Library, Navigate, Tab } from "./types";
import type { Dispatch, SetStateAction } from "react";
export type AppContextValue = {
  appearance: Appearance;
  setAppearance: Dispatch<SetStateAction<Appearance>>;
  library: Library;
  setLibrary: Dispatch<SetStateAction<Library>>;
  navigate: Navigate;
  tab: Tab;
  detail: string;
  notify: (message: string) => void;
  openAppearance: () => void;
};
export const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
