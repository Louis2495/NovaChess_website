import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
test("continuous analysis outlives both the old move budget and watchdog, then terminates on abort", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "nova-engine-"));
  const source = readFileSync("src/lib/engine.ts", "utf8").replace(
    /^import .*;\n/gm,
    "",
  );
  const file = join(dir, "engine.mjs");
  writeFileSync(
    file,
    'const base="/";\n' +
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
  );
  const originalWorker = globalThis.Worker,
    originalDocument = globalThis.document;
  let worker;
  globalThis.document = { baseURI: "https://example.com/" };
  globalThis.Worker = class {
    commands = [];
    terminated = false;
    constructor() {
      worker = this;
    }
    postMessage(v) {
      this.commands.push(v);
    }
    terminate() {
      this.terminated = true;
    }
    emit(v) {
      this.onmessage({ data: v });
    }
  };
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { search } = await import(pathToFileURL(file).href);
    const ctrl = new AbortController();
    let settled = false;
    const result = search(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      { infinite: true, signal: ctrl.signal },
    );
    const rejection = assert.rejects(result, { name: "AbortError" });
    result.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    worker.emit("uciok");
    worker.emit("readyok");
    assert.ok(worker.commands.includes("go infinite"));
    t.mock.timers.tick(60000);
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(worker.terminated, false);
    worker.emit("info depth 28 score cp 20 pv e2e4");
    ctrl.abort();
    await rejection;
    assert.equal(worker.terminated, true);
  } finally {
    globalThis.Worker = originalWorker;
    globalThis.document = originalDocument;
    t.mock.timers.reset();
    rmSync(dir, { recursive: true, force: true });
  }
});
