import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
let handler,
  temp,
  calls = 0;
const originalFetch = globalThis.fetch;
before(async () => {
  globalThis.Deno = {
    serve(fn) {
      handler = fn;
    },
  };
  globalThis.fetch = async (url) => {
    calls++;
    assert.match(
      String(url),
      /^https:\/\/(lichess.org\/api\/fide\/player\/\d+|www.uschess.org\/msa\/MbrDtlMain.php\?\d+)$/,
    );
    return String(url).includes("lichess.org")
      ? Response.json({ id: 1503014, name: "Example", standard: 2800 })
      : new Response(
          "<h2>12641216: Example</h2><table><tr><td>Regular Rating</td><td>2400</td></tr></table>",
        );
  };
  const source = readFileSync(
    "supabase/functions/federation-records/index.ts",
    "utf8",
  ).replace(
    /["']\.\.\/\.\.\/\.\.\/src\/lib\/federations.ts["']/,
    JSON.stringify(pathToFileURL(resolve("src/lib/federations.ts")).href),
  );
  temp = mkdtempSync(join(tmpdir(), "nova-federation-"));
  const file = join(temp, "handler.mjs");
  writeFileSync(
    file,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
  await import(pathToFileURL(file).href);
});
after(() => {
  globalThis.fetch = originalFetch;
  rmSync(temp, { recursive: true, force: true });
});
const request = (body) =>
  handler(
    new Request("http://local/federation-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
test("the deployed handler reads only supported public federation records and caches them", async () => {
  const first = await request({ kind: "uscf", id: "12641216" });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).standard, 2400);
  const count = calls;
  await request({ kind: "uscf", id: "12641216" });
  assert.equal(calls, count);
  const fide = await request({ kind: "fide", id: "1503014" });
  assert.equal(fide.status, 200);
  assert.equal((await fide.json()).standard, 2800);
});
test("unsupported federations and arbitrary/private URLs never reach fetch", async () => {
  const count = calls;
  for (const body of [
    { kind: "other", id: "12345678" },
    { kind: "uscf", id: "http://127.0.0.1/admin" },
    { kind: "fide", id: "https://example.com/1503014" },
    { kind: "fide", id: "" },
  ])
    assert.equal((await request(body)).status, 400);
  assert.equal(calls, count);
  assert.equal(
    (await handler(new Request("http://local", { method: "GET" }))).status,
    405,
  );
});
