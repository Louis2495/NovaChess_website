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
  const { navigate } = useApp();
  useControl("focusMode", toggleFocus);
  useControl("clearMarks", exitFocus);
  useControl("newGame", () => navigate("play", "setup"));
  useControl("analysis", () => navigate("analysis"));
  useControl("home", () => navigate("home"));
  useControl("search", openSearch);
  return null;
}
