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

// Use the pinned single-threaded build in the Edge Function without its CLI
// or browser worker bootstrap. Supply the WASM bytes from the bundled file.
const stockfishSource = await readFile(`${source}.js`, "utf8");
const factoryStart = stockfishSource.indexOf("function e(){");
const factoryEnd = stockfishSource.indexOf('}"undefined"!=typeof globalThis&&"string"==typeof globalThis.name', factoryStart);
const platformDetection = 'n=!!globalThis.window,a=!!globalThis.WorkerGlobalScope,o=globalThis.process?.versions?.node&&"renderer"!=globalThis.process?.type';
const factory = stockfishSource.slice(factoryStart, factoryEnd + 1);
if (factoryStart < 0 || factoryEnd < 0 || !factory.includes(platformDetection)) {
  throw new Error("The pinned Stockfish build changed its factory format.");
}
await writeFile("supabase/functions/chess/vendor/team-stockfish.mjs",
  stockfishSource.slice(0, factoryStart).split("!function(){")[0] +
  "const global = undefined;\n" + factory.replace(platformDetection, "n=false,a=false,o=false") + "\nexport default e();\n");
await copyFile(`${source}.wasm`, "supabase/functions/chess/vendor/team-stockfish.wasm");
