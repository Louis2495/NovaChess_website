import { useState } from "react";
import { RotateCcw, Keyboard } from "lucide-react";
import { useApp } from "../lib/context";
import { defaultControls, resolveControls } from "../lib/controls";
import { Button, Card, PageTitle } from "../components/UI";
const labels: Record<string, string> = {
  flip: "Flip board",
  focusMode: "Board-only focus mode",
  newGame: "New game setup",
  analysis: "Open analysis",
  home: "Go Home",
  search: "Search",
  previous: "Previous move",
  next: "Next move",
  first: "First move",
  last: "Last move",
  autoplay: "Play / stop",
  clearMarks: "Clear annotations / cancel",
};
export default function Controls({ embedded = false }: { embedded?: boolean }) {
  const { appearance, setAppearance, notify } = useApp();
  const [capture, setCapture] = useState("");
  const keys = resolveControls(appearance.controls);
  return (
    <>
      {!embedded && <PageTitle title="Controls" />}
      <Card className="controls-card">
        <div className="card-heading">
          <h2>Keyboard</h2>
          <Keyboard size={22} />
        </div>
        {Object.entries(labels).map(([key, label]) => (
          <div className="control-row" key={key}>
            <span>{label}</span>
            <button
              className="key-binding"
              onClick={() => setCapture(key)}
              onKeyDown={(e) => {
                if (capture !== key) return;
                e.preventDefault();
                e.stopPropagation();
                if (e.key === "Backspace" || e.key === "Delete") {
                  setAppearance((a) => ({
                    ...a,
                    controls: { ...keys, [key]: "" },
                  }));
                  setCapture("");
                  return;
                }
                if (["Control", "Shift", "Alt", "Meta", "Tab"].includes(e.key))
                  return;
                if (
                  Object.entries(keys).some(
                    ([k, v]) =>
                      k !== key &&
                      !k.startsWith("mark") &&
                      v.toLowerCase() === e.key.toLowerCase(),
                  )
                ) {
                  notify("That key is already assigned.");
                  return;
                }
                setAppearance((a) => ({
                  ...a,
                  controls: { ...keys, [key]: e.key },
                }));
                setCapture("");
              }}
            >
              {capture === key
                ? "Press a key"
                : keys[key as keyof typeof keys] === " "
                  ? "Space"
                  : keys[key as keyof typeof keys] || "Unassigned"}
            </button>
          </div>
        ))}
      </Card>
      <Card className="controls-card">
        <div className="control-row">
          <span>Cancel premoves</span>
          <kbd>Right click</kbd>
        </div>
        <h2>Right-click annotations</h2>
        {[
          ["mark", "green", "Square / arrow"],
          ["markBlue", "blue", "Blue"],
          ["markRed", "red", "Rose"],
          ["markGold", "gold", "Gold"],
        ].map(([key, color, label]) => (
          <div className="control-row" key={key}>
            <label className="color-control">
              <input
                aria-label={`${label} annotation color`}
                type="color"
                value={
                  appearance.markColors?.[color as "green"] ||
                  {
                    green: "#63d6a1",
                    blue: "#67b8ff",
                    red: "#ff7b92",
                    gold: "#ffd071",
                  }[color]!
                }
                onChange={(e) =>
                  setAppearance((a) => ({
                    ...a,
                    markColors: {
                      green: "#63d6a1",
                      blue: "#67b8ff",
                      red: "#ff7b92",
                      gold: "#ffd071",
                      ...a.markColors,
                      [color]: e.target.value,
                    },
                  }))
                }
              />
              {label}
            </label>
            <select
              aria-label={`${label} modifier`}
              value={keys[key as keyof typeof keys]}
              onChange={(e) => {
                const v = e.target.value;
                const conflicting = Object.entries(keys).find(
                  ([k, val]) => k.startsWith("mark") && k !== key && val === v,
                )?.[0];
                setAppearance((a) => ({
                  ...a,
                  controls: {
                    ...keys,
                    [key]: v,
                    ...(conflicting
                      ? { [conflicting]: keys[key as keyof typeof keys] }
                      : {}),
                  },
                }));
              }}
            >
              <option value="none">Right click</option>
              <option value="shift">Shift + right click</option>
              <option value="alt">Alt + right click</option>
              <option value="ctrl">Ctrl / ⌘ + right click</option>
            </select>
          </div>
        ))}
        <p className="caption">
          Click a square to mark it. Drag to draw an arrow.
        </p>
      </Card>
      <Button
        className="secondary"
        onClick={() => {
          setAppearance((a) => ({
            ...a,
            controls: defaultControls,
            markColors: undefined,
          }));
          setCapture("");
        }}
      >
        <RotateCcw size={16} />
        Reset controls
      </Button>
    </>
  );
}
