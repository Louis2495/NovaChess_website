import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/engine", { recursive: true });
for (const f of [
  "stockfish-19-lite-single.js",
  "stockfish-19-lite-single.wasm",
])
  await copyFile(`node_modules/stockfish/bin/${f}`, `public/engine/${f}`);
// Package the pinned authoritative variant engine for the Edge Function.
await mkdir('supabase/functions/chess/vendor',{recursive:true});
for(const file of ['ffish.js','ffish.wasm'])await copyFile(`node_modules/ffish-es6/${file}`,`supabase/functions/chess/vendor/${file}`);
