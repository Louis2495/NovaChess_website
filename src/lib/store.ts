import { useEffect, useState } from "react";
import type { Appearance, Library } from "./types";
export const APP_SOURCE = "https://github.com/Louis2495/ChessVision";
export const base = import.meta.env.BASE_URL;
export const initialFen =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const themes: Record<string, string> = {
  Steel: "#b2d3e7",
  Periwinkle: "#c7c1ff",
  Forest: "#96d9b8",
  Pink: "#ef7eb6",
  Ocean: "#72b2ff",
  Plum: "#bd8ae4",
  Amber: "#e8b953",
  Rose: "#ef8ca0",
  Teal: "#5fd0c1",
  Indigo: "#a19bf1",
  Graphite: "#a5b4c7",
};
export const boards: Record<string, [string, string]> = {
  Classic: ["#e8e3d1", "#7b997f"],
  Walnut: ["#ead7b7", "#6e4730"],
  Slate: ["#dfe6ee", "#526680"],
  Ocean: ["#deeaf2", "#376e99"],
  Sand: ["#f3e4c7", "#ab844c"],
  Rose: ["#f5dfe4", "#a85d77"],
  Mint: ["#ddefe5", "#527f69"],
  Lavender: ["#e9e2f1", "#7c6899"],
  Cocoa: ["#e8d8cb", "#795848"],
  Ebony: ["#e4e4e4", "#414751"],
  Tournament: ["#f0ecd8", "#3b6c48"],
  Ice: ["#e8f4f6", "#4b8290"],
};
export const pieceSets = [
  "Illustrated",
  "Merida",
  "Sculpted",
  "Fantasy",
  "Chessnut",
  "Celtic",
];
export const backgrounds = [
  "Default",
  "Pink",
  "Warm",
  "Cool",
  "Parchment",
  "Sage",
  "Lavender",
  "Blush",
  "Theme",
  "Aurora",
  "Sunset",
  "Grid",
  "Custom",
  "Flag",
];
export const annotationColors = {
  green: "#1fba62",
  blue: "#2684ff",
  red: "#f04461",
  gold: "#ff9c16",
};
export const defaults: Appearance = {
  theme: "Steel",
  background: "Default",
  backgroundColor: "#252e3a",
  accent: "#b2d3e7",
  buttonColor: "#a7bfd6",
  textColor: "#f3f6fa",
  mutedColor: "#bdc9d5",
  panelColor: "#354354",
  board: "Classic",
  light: boards.Classic[0],
  dark: boards.Classic[1],
  pieceStyle: "Illustrated",
  customBackground: "",
  backgroundBlur: 0,
  backgroundDim: 65,
  panelOpacity: 92,
  radius: 16,
  font: "Manrope",
  fontSize: 16,
  density: "Comfortable",
  coordinates: true,
  legalMoves: true,
  lastMove: true,
  animation: true,
  sound: false,
  music: false,
  volume: 0.25,
  autoQueen: false,
  confirmResign: false,
  premoves: true,
  multiPV: 1,
  searchTime: 1200,
  boardSize: 540,
};
export const emptyLibrary: Library = {
  games: [],
  folders: ["Games", "Studies"],
  repertoire: [],
  progress: {
    rating: 1000,
    attempts: 0,
    solved: 0,
    streak: 0,
    completed: [],
    daily: {},
    learned: [],
    endgames: [],
  },
  profile: { name: "You", country: "", avatar: "", friends: [] },
  activeGame: null,
  localRating: 1000,
  analysis: null,
};
export function uid() {
  return (
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(initial))
        return Array.isArray(parsed) ? parsed : initial;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? { ...initial, ...parsed }
        : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      window.dispatchEvent(
        new CustomEvent("storage-warning", {
          detail:
            "Browser storage is full or unavailable. Export a backup before leaving.",
        }),
      );
    }
  }, [key, value]);
  return [value, setValue] as const;
}
const cached = new Map<string, Promise<unknown>>();
export function loadData<T>(name: string): Promise<T> {
  if (!cached.has(name))
    cached.set(
      name,
      fetch(`${base}data/${name}.json`)
        .then((r) => {
          if (!r.ok)
            throw new Error(
              `Could not load ${name}. Check the connection and retry.`,
            );
          return r.json();
        })
        .catch((e) => {
          cached.delete(name);
          throw e;
        }),
    );
  return cached.get(name) as Promise<T>;
}
export function useData<T>(name: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadData<T>(name)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [name]);
  return { data, error };
}
export function download(
  name: string,
  body: string | Blob,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    body instanceof Blob ? body : new Blob([body], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
export async function imageFile(file: File, max = 1600) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose an image smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function contrast(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((v) => parseInt(v, 16) / 255) || [0, 0, 0];
  const l = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] > 0.179
    ? "#101610"
    : "#ffffff";
}
export function pieceUrl(code: string, style: string) {
  return `${base}pieces/${style === "Illustrated" ? "" : style.toLowerCase() + "/"}${code}.svg`;
}
export const dateLabel = (time: number) =>
  new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const boardSizeKey = (tab: string, detail: string) =>
  `${tab}:${tab === "learn" ? detail.split(":")[0] : ""}`;
