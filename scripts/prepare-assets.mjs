import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/engine", { recursive: true });
for (const f of [
  "stockfish-19-lite-single.js",
  "stockfish-19-lite-single.wasm",
])
  await copyFile(`node_modules/stockfish/bin/${f}`, `public/engine/${f}`);
