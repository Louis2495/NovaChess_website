import { useControl } from "../lib/controls";
import { useApp } from "../lib/context";
export default function WorkspaceShortcuts({
  toggleFocus,
  exitFocus,
  openSearch,
}: {
  toggleFocus: () => void;
  exitFocus: () => void;
  openSearch: () => void;
}) {
  const { navigate, setAppearance } = useApp();
  useControl("focusMode", toggleFocus);
  useControl("clearMarks", exitFocus);
  useControl("newGame", () => navigate("play", "setup"));
  useControl("analysis", () => navigate("analysis"));
  useControl("puzzles", () => navigate("puzzles"));
  useControl("learn", () => navigate("learn"));
  useControl("home", () => navigate("home"));
  useControl("search", openSearch);
  useControl("legalHints", () =>
    setAppearance((a) => ({ ...a, legalMoves: !a.legalMoves })),
  );
  useControl("coordinates", () =>
    setAppearance((a) => ({ ...a, coordinates: !a.coordinates })),
  );
  useControl("sound", () => setAppearance((a) => ({ ...a, sound: !a.sound })));
  return null;
}
