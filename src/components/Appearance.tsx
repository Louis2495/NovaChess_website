import { useState } from "react";
import {
  Palette,
  ImagePlus,
  RotateCcw,
  Download,
  SlidersHorizontal,
  Square,
  Volume2,
  Move,
  Check,
} from "lucide-react";
import { useApp } from "../lib/context";
import {
  themes,
  boards,
  pieceSets,
  backgrounds,
  defaults,
  download,
  imageFile,
  usePersistent,
  initialFen,
  contrast,
} from "../lib/store";
import { regions } from "../lib/regions";
import type { Appearance as AppearanceType } from "../lib/types";
import { ChoiceSelect, Modal, Button, Field, Toggle } from "./UI";
import { Board, Piece } from "./Board";
const sections = [
  ["Colors", Palette],
  ["Background", ImagePlus],
  ["Board", Square],
  ["Layout", SlidersHorizontal],
  ["Audio", Volume2],
  ["Moves", Move],
] as const;
export default function Appearance({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { appearance: a, setAppearance: set, notify } = useApp();
  const [tab, setTab] = useState("Colors"),
    [presets, setPresets] = usePersistent<
      { name: string; settings: AppearanceType }[]
    >("novachess-presets-v2", []),
    [name, setName] = useState("");
  const change = <K extends keyof AppearanceType>(
    key: K,
    value: AppearanceType[K],
  ) => set((v) => ({ ...v, [key]: value, ...(key === "font" ? { fontCustomized: true } : {}) }));
  function color(
    label: string,
    key:
      | "accent"
      | "buttonColor"
      | "textColor"
      | "mutedColor"
      | "panelColor"
      | "backgroundColor"
      | "light"
      | "dark",
  ) {
    return (
      <label className="color-field">
        <span>{label}</span>
        <span>
          <code>{a[key]}</code>
          <input
            type="color"
            value={a[key]}
            onChange={(e) => change(key, e.target.value)}
          />
        </span>
      </label>
    );
  }
  function slider(
    label: string,
    key:
      | "backgroundBlur"
      | "backgroundDim"
      | "panelOpacity"
      | "radius"
      | "fontSize"
      | "volume"
      | "boardSize",
    min: number,
    max: number,
    step = 1,
  ) {
    return (
      <label className="range-field">
        <span>
          {label}
          <b>{key === "volume" ? Math.round(a[key] * 100) + "%" : a[key]}</b>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={a[key]}
          onChange={(e) => {
            change(key, Number(e.target.value));
            if (key === "boardSize")
              set((v) => ({
                ...v,
                boardSizes: {},
                globalBoardSize: Number(e.target.value),
              }));
          }}
        />
      </label>
    );
  }
  const content = (
    <>
      <div className="appearance-layout">
        <div
          className="appearance-sections"
          role="tablist"
          aria-label="Appearance sections"
        >
          {sections.map(([label, Icon]) => (
            <button
              role="tab"
              aria-selected={tab === label}
              key={label}
              onClick={() => setTab(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <div className="appearance-controls">
          <div className="appearance-preview">
            <Board fen={initialFen} disabled compact />
            <div>
              <span className="eyebrow">LIVE PREVIEW</span>
              <h3>{a.theme}</h3>
              <span className="btn">Preview button</span>
              <p>All changes save automatically.</p>
            </div>
          </div>
          {tab === "Colors" && (
            <>
              <h3>App themes</h3>
              <div className="theme-grid">
                {Object.entries(themes).map(([name, color]) => (
                  <button
                    className={a.theme === name ? "active" : ""}
                    key={name}
                    onClick={() =>
                      set((v) => ({
                        ...v,
                        theme: name,
                        accent: color,
                        buttonColor: color,
                      }))
                    }
                  >
                    <span style={{ background: color, color: contrast(color) }}>
                      {a.theme === name && <Check size={16} />}
                    </span>
                    {name}
                  </button>
                ))}
              </div>
              <h3>Custom colors</h3>
              {color("Accent", "accent")}
              {color("Buttons", "buttonColor")}
              {color("Text", "textColor")}
              {color("Secondary text", "mutedColor")}
              {color("Panels", "panelColor")}
              <p className="caption">
                Button text adjusts for contrast. Custom text colors are yours
                to control.
              </p>
            </>
          )}
          {tab === "Background" && (
            <>
              <Field label="Background">
                <ChoiceSelect
                  value={a.background}
                  onChange={(e) =>
                    set((a) => ({
                      ...a,
                      background: e.target.value,
                      flag: a.flag || "US",
                    }))
                  }
                >
                  {backgrounds.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </ChoiceSelect>
              </Field>
              {a.background === "Flag" && (
                <Field label="Country flag">
                  <ChoiceSelect
                    value={a.flag || "US"}
                    onChange={(e) => change("flag", e.target.value)}
                  >
                    {regions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </ChoiceSelect>
                </Field>
              )}
              {color("Base color", "backgroundColor")}
              <label className="upload-tile">
                <ImagePlus />
                <span>Upload a background</span>
                <small>JPG, PNG, WebP · stays in this browser</small>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const image = await imageFile(file);
                      set((v) => ({
                        ...v,
                        background: "Custom",
                        customBackground: image,
                      }));
                      notify("Background saved.");
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                />
              </label>
              {a.customBackground && (
                <>
                  <img
                    className="background-thumbnail"
                    src={a.customBackground}
                    alt="Your background"
                  />
                  <Button
                    className="secondary"
                    onClick={() =>
                      set((v) => ({
                        ...v,
                        background: "Default",
                        customBackground: "",
                      }))
                    }
                  >
                    Remove image
                  </Button>
                </>
              )}
              {slider("Image dimming", "backgroundDim", 0, 95)}
              {slider("Background blur", "backgroundBlur", 0, 24)}
              {slider("Panel opacity", "panelOpacity", 20, 100)}
            </>
          )}
          {tab === "Board" && (
            <>
              <Field label="Board palette">
                <ChoiceSelect
                  value={a.board}
                  onChange={(e) => {
                    const b = e.target.value;
                    set((v) => ({
                      ...v,
                      board: b,
                      light: boards[b][0],
                      dark: boards[b][1],
                    }));
                  }}
                >
                  {Object.keys(boards).map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </ChoiceSelect>
              </Field>
              {color("Light squares", "light")}
              {color("Dark squares", "dark")}
              <h3>Pieces</h3>
              <div className="piece-set-grid">
                {pieceSets.map((s) => (
                  <button
                    key={s}
                    className={a.pieceStyle === s ? "active" : ""}
                    onClick={() => change("pieceStyle", s)}
                  >
                    <Piece symbol="N" style={s} />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
              {slider("Board width", "boardSize", 160, 1400, 10)}
              <Toggle
                label="Coordinates"
                checked={a.coordinates}
                onChange={(v) => change("coordinates", v)}
              />
              <Toggle
                label="Legal move dots"
                checked={a.legalMoves}
                onChange={(v) => change("legalMoves", v)}
              />
              <Toggle
                label="Highlight last move"
                checked={a.lastMove}
                onChange={(v) => change("lastMove", v)}
              />
            </>
          )}
          {tab === "Layout" && (
            <>
              <Field label="Font">
                <ChoiceSelect
                  value={a.font}
                  onChange={(e) => change("font", e.target.value)}
                >
                  {[
                    "DM Sans",
                    "Charlesworth", "Nunito Sans", "Manrope",
                    "Georgia",
                    "system-ui",
                    "monospace",
                  ].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </ChoiceSelect>
              </Field>
              {slider("Text size", "fontSize", 12, 18)}
              {slider("Corner radius", "radius", 0, 32)}
              <Field label="Spacing">
                <ChoiceSelect
                  value={a.density}
                  onChange={(e) => change("density", e.target.value)}
                >
                  <option>Compact</option>
                  <option>Comfortable</option>
                  <option>Spacious</option>
                </ChoiceSelect>
              </Field>
              <Toggle
                label="Animations"
                checked={a.animation}
                onChange={(v) => change("animation", v)}
              />
              {slider("Panel opacity", "panelOpacity", 20, 100)}
            </>
          )}
          {tab === "Audio" && (
            <>
              <Toggle
                label="Move sounds"
                checked={a.sound}
                onChange={(v) => change("sound", v)}
              />
              <Toggle
                label="Piano music"
                description="The app’s Field and Burgmüller recordings."
                checked={a.music}
                onChange={(v) => change("music", v)}
              />
              {slider("Volume", "volume", 0, 1, 0.05)}
              <p className="caption">
                Audio starts only after you enable it. No audio is loaded until
                then.
              </p>
              <p className="caption">
                Field, Nocturne No. 5 · Burgmüller, Consolation and Douce
                plainte. NovaChess synthesized performance, CC BY-SA 4.0.{" "}
                <a
                  className="external"
                  href="./licenses/Piano-provenance.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Credits
                </a>
              </p>
            </>
          )}
          {tab === "Moves" && (
            <>
              <Toggle
                label="Premoves"
                checked={a.premoves}
                onChange={(v) => change("premoves", v)}
              />
              <Toggle
                label="Auto-queen"
                checked={a.autoQueen}
                onChange={(v) => change("autoQueen", v)}
              />
              <Toggle
                label="Confirm resign"
                checked={a.confirmResign}
                onChange={(v) => change("confirmResign", v)}
              />
              <Field label="Analysis candidates">
                <ChoiceSelect
                  value={a.multiPV}
                  onChange={(e) => change("multiPV", Number(e.target.value))}
                >
                  <option value={1}>One line</option>
                  <option value={3}>Three lines</option>
                </ChoiceSelect>
              </Field>
            </>
          )}
          <div className="preset-section">
            <h3>Personal presets</h3>
            <div className="inline-form">
              <input
                aria-label="Preset name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Preset name"
                maxLength={35}
              />
              <Button
                disabled={!name.trim()}
                onClick={() => {
                  setPresets((p) => [
                    ...p.filter((x) => x.name !== name.trim()),
                    { name: name.trim(), settings: a },
                  ]);
                  setName("");
                  notify("Preset saved.");
                }}
              >
                Save
              </Button>
            </div>
            {presets.map((p, i) => (
              <div key={p.name} className="preset-row">
                <button onClick={() => set(p.settings)}>{p.name}</button>
                <button
                  className="subtle"
                  onClick={() => setPresets((p) => p.filter((_, n) => n !== i))}
                >
                  Delete
                </button>
              </div>
            ))}
            <div className="button-row">
              <Button
                className="secondary"
                onClick={() =>
                  download(
                    "novachess-appearance.json",
                    JSON.stringify(
                      { type: "novachess-appearance", settings: a },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Download size={15} />
                Export
              </Button>
            </div>
            <Button
              className="text-button"
              onClick={() => {
                set(defaults);
                notify("Default dark appearance restored.");
              }}
            >
              <RotateCcw size={14} />
              Reset appearance
            </Button>
          </div>
        </div>
      </div>
    </>
  );
  return embedded ? <section className="appearance-inline" aria-label="Appearance">{content}</section> : <Modal title="Appearance" onClose={onClose} wide>{content}</Modal>;
}
