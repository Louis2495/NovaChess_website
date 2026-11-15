import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { pieceUrl, base, download } from "./store";
import { squares } from "./variants";
import type { Appearance } from "./types";
const imageCache = new Map<string, Promise<HTMLImageElement>>();
function image(url: string) {
  if (!imageCache.has(url))
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () =>
          reject(new Error("Could not load the piece artwork."));
        i.src = url;
      }),
    );
  return imageCache.get(url)!;
}
export async function renderBoard(
  fen: string,
  a: Appearance,
  flipped = false,
  size = 640,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!,
    p = squares(fen),
    cell = size / 8;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const file = flipped ? 7 - x : x,
        rank = flipped ? y + 1 : 8 - y,
        sq = "abcdefgh"[file] + rank;
      ctx.fillStyle = (file + 8 - rank) % 2 ? a.dark : a.light;
      ctx.fillRect(x * cell, y * cell, cell, cell);
      const piece = p[sq];
      if (piece) {
        const url =
          piece === "*"
            ? `${base}duck.webp`
            : pieceUrl(
                `${piece === piece.toUpperCase() ? "w" : "b"}${piece.toUpperCase()}`,
                a.pieceStyle,
              );
        const img = await image(url);
        ctx.drawImage(img, x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
      if (a.coordinates) {
        ctx.font = `bold ${Math.max(10, size / 64)}px sans-serif`;
        ctx.fillStyle = (file + 8 - rank) % 2 ? a.light : a.dark;
        if (x === 0) ctx.fillText(String(rank), x * cell + 4, y * cell + 13);
        if (y === 7)
          ctx.fillText("abcdefgh"[file], (x + 1) * cell - 12, size - 5);
      }
    }
  return canvas;
}
export async function exportPNG(fen: string, a: Appearance, flipped = false) {
  const canvas = await renderBoard(fen, a, flipped);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) =>
      b ? resolve(b) : reject(new Error("Image export failed.")),
    ),
  );
  download("novachess-position.png", blob);
}
export async function exportGIF(
  positions: string[],
  a: Appearance,
  flipped = false,
  onProgress?: (n: number) => void,
) {
  const gif = GIFEncoder();
  const frames = positions.slice(0, 160);
  for (let i = 0; i < frames.length; i++) {
    const canvas = await renderBoard(frames[i], a, flipped, 320),
      data = canvas.getContext("2d")!.getImageData(0, 0, 320, 320).data,
      palette = quantize(data, 128),
      index = applyPalette(data, palette);
    gif.writeFrame(index, 320, 320, {
      palette,
      delay: i === 0 || i === frames.length - 1 ? 1200 : 550,
      repeat: 0,
    });
    onProgress?.(Math.round(((i + 1) / frames.length) * 100));
    await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();
  download(
    "novachess-game.gif",
    new Blob([gif.bytesView().slice().buffer], { type: "image/gif" }),
  );
}
