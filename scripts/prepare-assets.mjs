import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";

const stockfish = "stockfish-19-lite-single";
const source = `node_modules/stockfish/bin/${stockfish}`;
const target = `public/engine/${stockfish}`;

// Stockfish calls instantiateStreaming directly. Static hosts can serve the
// same valid WASM bytes as a generic binary response.
const wasmFallback = `if (typeof WebAssembly !== "undefined") {
  const stream = WebAssembly.instantiateStreaming?.bind(WebAssembly);
  WebAssembly.instantiateStreaming = async (source, imports) => {
    const response = await source;
    const mime = response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
    if (stream && mime === "application/wasm") return stream(response, imports);
    return WebAssembly.instantiate(await response.arrayBuffer(), imports);
  };
}
`;

await mkdir("public/engine", { recursive: true });
await writeFile(`${target}.js`, wasmFallback + await readFile(`${source}.js`, "utf8"));
await copyFile(`${source}.wasm`, `${target}.wasm`);
// Package the pinned authoritative variant engine for the Edge Function.
await mkdir('supabase/functions/chess/vendor',{recursive:true});
for(const file of ['ffish.js','ffish.wasm'])await copyFile(`node_modules/ffish-es6/${file}`,`supabase/functions/chess/vendor/${file}`);
