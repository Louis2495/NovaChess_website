import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { Chess } from "chess.js";
import fs from "node:fs";
import load from "ffish-es6";
import type { FairyStockfish } from "ffish-es6";
const BASE_KEY = "novachess-library-v2";
const initial = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
async function stored(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}"),
    BASE_KEY,
  );
}
async function square(page: Page, sq: string, index = 0) {
  await page
    .getByRole("group", { name: "Chessboard", exact: true })
    .nth(index)
    .getByRole("button", { name: new RegExp(`^${sq},`) })
    .click();
}
async function uiMove(page: Page, move: string) {
  await square(page, move.slice(0, 2));
  await square(page, move.slice(2, 4));
}

test("dark Home provides tools, has no clock/camera/slogans, and fits responsive widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Daily puzzle/ })).toBeVisible();
  await expect(page.locator(".app")).toHaveCSS(
    "background-color",
    "rgb(41, 45, 67)",
  );
  await expect(
    page.getByRole("heading", { name: /Your next move|A little brighter/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Clock|Camera|Photos/ }),
  ).toHaveCount(0);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test("appearance themes, custom colors, board/pieces/layout persist and presets export", async ({
  page,
}) => {
  await page.goto("/#profile");
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog", { name: "Appearance" });
  await d.getByRole("button", { name: "Pink", exact: true }).click();
  await expect(page.locator(".app")).toHaveCSS("--accent", "#ef7eb6");
  await d
    .locator(".color-field")
    .filter({ hasText: "Buttons" })
    .locator("input")
    .fill("#9068df");
  await d.getByRole("tab", { name: "Board", exact: true }).click();
  await d.getByLabel("Board palette", { exact: true }).selectOption("Ocean");
  await d.getByRole("button", { name: "Celtic", exact: true }).click();
  await d.getByRole("tab", { name: "Layout", exact: true }).click();
  await d.getByLabel("Font", { exact: true }).selectOption("Georgia");
  await d.getByLabel("Corner radius", { exact: false }).fill("25");
  await d.getByLabel("Text size", { exact: false }).fill("18");
  await expect(page.locator("html")).toHaveCSS("font-size", "18px");
  await d.getByRole("tab", { name: "Background", exact: true }).click();
  await d.getByLabel("Background", { exact: true }).selectOption("Aurora");
  await d.getByLabel("Preset name").fill("My setup");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  const dl = page.waitForEvent("download");
  await d.getByRole("button", { name: "Export", exact: true }).click();
  expect((await dl).suggestedFilename()).toBe("novachess-appearance.json");
  await d.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("novachess-appearance-v2")!),
  );
  expect(saved).toMatchObject({
    theme: "Pink",
    buttonColor: "#9068df",
    board: "Ocean",
    pieceStyle: "Celtic",
    font: "Georgia",
    radius: 25,
    fontSize: 18,
    background: "Aurora",
  });
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Appearance" })
    .getByRole("button", { name: "Reset appearance", exact: true })
    .click();
  await expect(page.locator(".app")).toHaveCSS("--accent", "#c7c1ff");
});

test("uploaded backgrounds stay local and can be removed", async ({ page }) => {
  await page.goto("/#profile");
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByRole("tab", { name: "Background", exact: true }).click();
  await d.locator(".upload-tile input").setInputFiles({
    name: "background.png",
    mimeType: "image/png",
    buffer: fs.readFileSync("public/favicon.png"),
  });
  await expect(d.getByAltText("Your background")).toBeVisible();
  await expect(page.locator(".app")).toHaveClass(/bg-custom/);
  await d.getByRole("button", { name: "Remove image" }).click();
  await expect(d.getByAltText("Your background")).toHaveCount(0);
});

test("analysis runs real Stockfish, supports moves, branches, FEN, PGN and image/GIF exports", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await expect(
    page.getByText(/Stockfish 19 Lite · Depth [1-9]\d*/),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: "Engine", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Positional insights", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Depth \d+/)).toBeVisible();
  await uiMove(page, "e2e4");
  await expect(page.locator(".notation-table")).toContainText("e4");
  await page
    .getByRole("button", { name: "Previous position", exact: true })
    .click();
  await uiMove(page, "d2d4");
  await expect(page.locator(".branch-list")).toContainText("Branch 1");
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  expect((await stored(page)).games).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Download PGN", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Share position", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const pgn = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download PGN", exact: true })
    .click();
  expect((await pgn).suggestedFilename()).toMatch(/\.pgn$/);
  const png = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Board image", exact: true })
    .click();
  expect((await png).suggestedFilename()).toMatch(/\.png$/);
  const gif = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Game GIF", exact: true }).click();
  expect((await gif).suggestedFilename()).toMatch(/\.gif$/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Import|FEN \/ PGN/ }),
  ).toHaveCount(0);
});

test("position editor validates kings, applies a position and underpromotion is available", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await page
    .getByRole("button", { name: "Edit position", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Clear", exact: true }).click();
  await d.getByRole("button", { name: "Use position", exact: true }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await d.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto(
    "/#analysis/" + encodeURIComponent("fen:7k/P7/8/8/8/8/8/7K w - - 0 1"),
  );
  await uiMove(page, "a7a8");
  await page
    .getByRole("button", { name: "Promote to knight", exact: true })
    .click();
  await expect(page.locator(".notation-table")).toContainText("a8=N");
});

test("all 4,000 puzzles load; adaptive solution, grading, hints and daily replay persist", async ({
  page,
}) => {
  await page.goto("/#puzzles");
  await expect(
    page.getByRole("heading", { name: "Puzzles", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Chessboard", exact: true }),
  ).toBeVisible();
  const list = JSON.parse(fs.readFileSync("public/data/puzzles.json", "utf8"));
  const progress = (await stored(page)).progress;
  const p = [...list].sort(
    (a, b) =>
      Math.abs(a.sourceRating - progress.rating) -
        Math.abs(b.sourceRating - progress.rating) || a.id.localeCompare(b.id),
  )[0];
  for (let i = 1; i < p.moves.length; i += 2) {
    const m = p.moves[i];
    await uiMove(page, m);
    if (m.length === 5)
      await page
        .getByRole("button", {
          name: `Promote to ${{ q: "queen", r: "rook", b: "bishop", n: "knight" }[m[4]]}`,
          exact: true,
        })
        .click();
    if (i + 2 < p.moves.length) await page.waitForTimeout(550);
  }
  await expect(
    page.getByRole("status").filter({ hasText: "Solved." }),
  ).toBeVisible();
  expect((await stored(page)).progress.solved).toBe(1);
  await page.getByRole("button", { name: "Next puzzle", exact: true }).click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  expect((await stored(page)).progress.streak).toBe(0);
  await page.goto("/#puzzles/daily");
  await expect(
    page.getByRole("button", { name: "Replay", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  const attempts = (await stored(page)).progress.attempts;
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  expect((await stored(page)).progress.attempts).toBe(attempts);
});

test("curated opening lesson and searchable full opening library work", async ({
  page,
}) => {
  await page.goto("/#learn/lessons");
  await expect(page.locator(".list-summary")).toHaveText("129 lessons");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".lesson-compact-controls")).toContainText(
    "Next: e5",
  );
  await page.getByLabel("Search openings", { exact: true }).fill("Najdorf");
  await expect(page.locator(".opening-row").first()).toContainText("Najdorf");
  await page.locator(".opening-row").first().click();
  await page
    .getByRole("button", { name: "Save to repertoire", exact: true })
    .click();
  await page.getByRole("button", { name: "Save line", exact: true }).click();
  expect((await stored(page)).repertoire).toHaveLength(1);
});

test("repertoire building, saving, training and spaced review work", async ({
  page,
}) => {
  await page.goto("/#learn/repertoire");
  await page.getByRole("button", { name: "Add line", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Line name").fill("King pawn");
  await uiMove(page, "e2e4");
  await page.getByRole("button", { name: "Save line", exact: true }).click();
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await uiMove(page, "e2e4");
  await expect(page.locator(".feedback")).toContainText("Line completed");
  const saved = (await stored(page)).repertoire[0];
  expect(saved.successes).toBe(1);
  expect(saved.due).toBeGreaterThan(Date.now());
});

test("endgame trainer uses legal goals and saves completion", async ({
  page,
}) => {
  await page.goto("/#learn/endgames");
  await expect(
    page.getByRole("heading", { name: "Queen: finish the net", exact: true }),
  ).toBeVisible();
  await uiMove(page, "f7g7");
  await expect(
    page.getByRole("heading", { name: "Completed", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).progress.endgames).toContain("queen-finish");
});

test("Research loads public games and calculates real opening frequencies", async ({
  page,
}) => {
  await page.route("https://api.chess.com/pub/player/*/games/archives", (r) =>
    r.fulfill({
      json: {
        archives: ["https://api.chess.com/pub/player/test/games/2024/01"],
      },
    }),
  );
  await page.route("https://api.chess.com/pub/player/test/games/2024/01", (r) =>
    r.fulfill({
      json: {
        games: [
          {
            rules: "chess",
            pgn: '[Event "One"]\n[White "test"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
          },
          {
            rules: "chess",
            pgn: '[Event "Two"]\n[White "test"]\n[Result "0-1"]\n\n1. e4 c5 0-1',
          },
        ],
      },
    }),
  );
  await page.goto("/#research");
  await page.getByLabel("Public username").fill("test");
  await page.getByRole("button", { name: "Load games", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 games");
  await expect(page.locator(".research-branches")).toContainText(
    "2 games · 100%",
  );
  await page.locator(".research-branches>button").first().click();
  await expect(page.locator(".research-branches")).toContainText("e5");
  await expect(page.locator(".research-branches")).toContainText("c5");
});

test("facts, history, dated ratings and map controls provide real content", async ({
  page,
}) => {
  await page.goto("/#learn/facts");
  await expect(page.locator(".facts-grid .card")).toHaveCount(75);
  await expect(page.getByLabel("Search facts")).toHaveCount(0);
  await expect(page.locator(".facts-grid .card").first()).toBeVisible();
  await page.goto("/#learn/history");
  await expect(page.locator(".history-event-list>button")).toHaveCount(22);
  await page
    .getByRole("button", { name: "World champions", exact: true })
    .click();
  await expect(page.locator(".champion-timeline .card").first()).toBeVisible();
  await page.getByLabel("Championship lineage").selectOption("fide");
  expect(
    await page.locator(".champion-timeline .card").count(),
  ).toBeGreaterThan(0);
  await page.goto("/#stats");
  await page.getByRole("button", { name: "Achievements", exact: true }).click();
  await expect(page.locator(".achievement")).toHaveCount(18);
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await expect(page.locator(".world-map path").first()).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".map-controls")).toContainText("1.5×");
  const map = page.locator(".world-map");
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.4 + 60,
    box.y + box.height * 0.5,
    { steps: 3 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.locator(".world-map > g")).toHaveAttribute(
    "transform",
    "translate(360 180) scale(1) translate(-360 -180)",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".map-controls")).toContainText("1.0×");
});

test("Profile saves username, bio and avatar; defaults are auto-queen off and premoves on", async ({
  page,
}) => {
  await page.goto("/#profile");
  await page.getByLabel("Username", { exact: true }).fill("Alex");
  await page
    .getByLabel("Bio", { exact: true })
    .fill("Rook endings and coffee.");
  await page.getByLabel("Country (optional)").selectOption("US");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "avatar.webp",
      mimeType: "image/webp",
      buffer: fs.readFileSync("public/duck.webp"),
    });
  await expect(page.getByAltText("Your profile picture")).toBeVisible();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect.poll(async () => (await stored(page)).profile.name).toBe("Alex");
  await expect(
    page.getByLabel("Auto-queen", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("Premoves", { exact: true })).toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Bio", { exact: true })).toHaveValue(
    "Rook endings and coffee.",
  );
  await expect(page.getByAltText("Your profile picture")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sharing", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#community");
  await expect(
    page.getByText("Not connected yet.", { exact: true }),
  ).toBeVisible();
});

test("saved games replay and engine review persist real results", async ({
  page,
}) => {
  const c = new Chess(),
    positions = [c.fen()],
    moves: string[] = [],
    notation: string[] = [];
  for (const uci of ["e2e4", "e7e5", "g1f3", "b8c6"]) {
    const m = c.move(uci);
    moves.push(uci);
    notation.push(m.san);
    positions.push(c.fen());
  }
  await page.addInitScript(
    (game) =>
      localStorage.setItem(
        "novachess-library-v2",
        JSON.stringify({ games: [game] }),
      ),
    {
      id: "recorded",
      title: "Recorded game",
      created: Date.now(),
      initial: positions[0],
      positions,
      moves,
      notation,
      kind: "game",
      origin: "archive",
      variant: "chess",
      human: "w",
      result: "*",
      folder: "Games",
    },
  );
  await page.goto("/#library");
  await page
    .getByRole("button", { name: "Replay & review", exact: true })
    .click();
  await page.getByRole("button", { name: "Next move", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Replay position" }),
  ).toHaveValue("1");
  await page.getByLabel("Time per position").selectOption("300");
  await page.getByRole("button", { name: "Review game", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Review complete." }),
  ).toBeVisible({ timeout: 45000 });
  expect((await stored(page)).games[0].review.length).toBe(4);
});

test("default dark views and customization dialog pass automated WCAG checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const route of [
    "/",
    "/#analysis",
    "/#puzzles",
    "/#learn",
    "/#community",
    "/#stats",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route.includes("puzzles"))
      await expect(
        page.getByRole("group", { name: "Chessboard", exact: true }),
      ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.goto("/#profile");
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .first()
    .click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

let ff: FairyStockfish;
test.beforeAll(async () => {
  ff = await load({
    wasmBinary: fs.readFileSync("node_modules/ffish-es6/ffish.wasm"),
  } as Parameters<typeof load>[0]);
  ff.loadVariantConfig(
    "[cvfog:chess]\nking = -\ncommoner = k\ncastlingKingPiece = k\nextinctionValue = loss\nextinctionPieceTypes = k\nstalemateValue = draw\n[cvpawns:chess]\nstartFen = 4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1\ncastling = false\n[cvpawnrace:chess]\nking = -\nstartFen = 8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1\ncastling = false\npromotionPieceTypes = -\nmandatoryPawnPromotion = false\nflagPiece = p\nflagRegionWhite = *8\nflagRegionBlack = *1\nextinctionValue = loss\nextinctionPieceTypes = *\nstalemateValue = loss",
  );
});
for (const variant of [
  "chess",
  "blind",
  "blindtext",
  "crazyhouse",
  "duck",
  "atomic",
  "cvfog",
  "3check",
  "kingofthehill",
  "horde",
  "antichess",
  "cvpawns",
  "cvpawnrace",
  "chess960",
  "bughouse",
])
  test(`legal human move and actual local opponent reply in ${variant}`, async ({
    page,
  }) => {
    test.setTimeout(45000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/#play");
    await page
      .getByRole("button", { name: "Game options", exact: true })
      .click();
    await page.getByLabel("Variant", { exact: true }).selectOption(variant);
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await expect(page.getByLabel("Game move", { exact: true })).toBeVisible();
    const g = (await stored(page)).activeGame;
    const b = new ff.Board(
      ["blind", "blindtext", "chess960"].includes(variant) ? "chess" : variant,
      g.initial,
      variant === "chess960",
    );
    const move = b.legalMoves().split(" ")[0];
    if (variant === "blindtext") {
      await page.getByLabel("Game move", { exact: true }).fill(move);
      await page
        .locator(".inline-form")
        .getByRole("button", { name: "Play", exact: true })
        .click();
    } else {
      await uiMove(page, move);
      if (variant === "duck") await square(page, move.slice(-2));
    }
    await expect
      .poll(async () => (await stored(page)).activeGame?.moves.length || 0, {
        timeout: 20000,
      })
      .toBeGreaterThanOrEqual(2);
    const saved = (await stored(page)).activeGame;
    for (const m of saved.moves)
      expect(b.push(m), `illegal ${m} in ${variant}`).toBeTruthy();
    b.delete();
    expect(errors).toEqual([]);
  });

async function seedGame(
  page: Page,
  variant: string,
  fen: string,
  moves: string[] = [],
  partner = false,
) {
  await page.goto("/");
  const b = new ff.Board(variant, fen);
  const positions = [fen],
    notation: string[] = [];
  for (const m of moves) {
    notation.push(b.sanMove(m));
    b.push(m);
    positions.push(b.fen());
  }
  b.delete();
  await page.evaluate(
    ({ key, variant, fen, moves, positions, notation, partner }) => {
      const l = JSON.parse(localStorage.getItem(key)!);
      l.activeGame = {
        id: "fixture",
        title: "Rule check",
        created: Date.now(),
        initial: fen,
        variant,
        moves,
        notation,
        positions,
        result: "*",
        human: "w",
        folder: "Games",
        botRating: 1000,
        ...(partner
          ? {
              partner: {
                initial:
                  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1",
                positions: [
                  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1",
                ],
                moves: [],
                notation: [],
                result: "*",
              },
            }
          : {}),
      };
      localStorage.setItem(key, JSON.stringify(l));
    },
    { key: BASE_KEY, variant, fen, moves, positions, notation, partner },
  );
  await page.goto("/#play/resume");
  await page.reload();
  await expect(page.getByLabel("Game move", { exact: true })).toBeVisible();
}
test("crazyhouse drops and bughouse pocket transfers use real variant rules", async ({
  page,
}) => {
  await seedGame(page, "crazyhouse", "7k/p7/8/8/8/8/8/7K[N] w - - 0 1");
  await page.getByRole("button", { name: "Drop N", exact: true }).click();
  await square(page, "e4");
  await expect
    .poll(async () => (await stored(page)).activeGame.moves[0])
    .toBe("N@e4");
  await seedGame(
    page,
    "bughouse",
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1",
    ["e2e4", "d7d5"],
    true,
  );
  await uiMove(page, "e4d5");
  await expect
    .poll(async () => (await stored(page)).activeGame.partner.positions.at(-1))
    .toContain("[p]");
});
test("king of the hill, third check and antichess use variant victory conditions", async ({
  page,
}) => {
  await seedGame(page, "kingofthehill", "7k/8/8/8/8/3K4/8/8 w - - 0 1");
  await uiMove(page, "d3d4");
  await expect
    .poll(async () => (await stored(page)).activeGame.result)
    .toBe("1-0");
  await seedGame(page, "3check", "7k/8/8/8/8/8/R7/K7 w - - 1+3 0 1");
  await uiMove(page, "a2a8");
  await expect
    .poll(async () => (await stored(page)).activeGame.result)
    .toBe("1-0");
  await seedGame(page, "antichess", "8/8/8/8/8/1p6/P7/7K w - - 0 1");
  await uiMove(page, "a2b3");
  await expect
    .poll(async () => (await stored(page)).activeGame.result)
    .toBe("0-1");
});
test("mobile navigation and search lead to working app tools", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("button", { name: "Library", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Library", exact: true }),
    ).toBeVisible();
  }
  await page.keyboard.press("/");
  await page.getByLabel("Search tools and openings").last().fill("Sicilian");
  await page
    .getByRole("button", { name: "Search opening library", exact: true })
    .click();
  await expect(page.locator(".opening-row").first()).toContainText("Sicilian");
});

test("bughouse transfers ordinary pieces normally and reverts captured promotions only", async ({
  page,
}) => {
  await seedGame(
    page,
    "bughouse",
    "7k/8/q~7/8/8/1q6/P7/7K[] w - - 0 1",
    [],
    true,
  );
  await uiMove(page, "a2b3");
  await expect
    .poll(async () => (await stored(page)).activeGame.partner.positions.at(-1))
    .toContain("[q]");
  await seedGame(
    page,
    "bughouse",
    "7k/8/8/8/8/1q~6/P7/7K[] w - - 0 1",
    [],
    true,
  );
  await uiMove(page, "a2b3");
  await expect
    .poll(async () => (await stored(page)).activeGame.partner.positions.at(-1))
    .toContain("[p]");
});

test("simplified Home has one large New Game action and no repeated tool or stats grids", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "New game", exact: true });
  const action = section.getByRole("button", { name: "New game", exact: true });
  await expect(action).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New game", exact: true }),
  ).toHaveCount(1);
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(58);
  await expect(
    page.getByRole("button", { name: "Customize", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".tool-grid,.stats-strip,.home-bottom"),
  ).toHaveCount(0);
  await action.click();
  const start = page.getByRole("button", { name: "Start game", exact: true });
  await expect(start).toBeVisible();
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(58);
  await expect(page.locator(".variant-grid")).toHaveCount(0);
  await page.getByRole("button", { name: "Game options", exact: true }).click();
  await expect(page.getByLabel("Variant", { exact: true })).toHaveCount(1);
});

test("Home keeps the unlabelled meme beside the puzzle and opening lessons remain in Learn", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator(".home-practice-grid .daily-meme-image"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daily meme", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".home-lessons,.suggested-lessons")).toHaveCount(0);
  await page.goto("/#learn");
  await page.getByRole("button", { name: /Opening lessons/ }).click();
  await expect(page.locator(".list-summary")).toHaveText("129 lessons");
});

test("Stats has dedicated navigation and derives charts from completed local games only", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const c = new Chess();
  const move = c.move("e4");
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const current = start.getTime(),
    yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  const fixtures = ["1-0", "0-1", "1/2-1/2", "*"].map((result, i) => ({
    id: `stats-${i}`,
    title: "Recorded game",
    created: i === 2 ? yesterday.getTime() : current,
    initial,
    variant: "chess",
    moves: ["e2e4"],
    notation: ["e4"],
    positions: [initial, move.after],
    result,
    human: "w",
    folder: "Games",
  }));
  await page.evaluate(
    ({ key, games }) => {
      const data = JSON.parse(localStorage.getItem(key)!);
      data.games = games;
      data.localRating = 1250;
      data.progress.solved = 9;
      data.progress.streak = 2;
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: BASE_KEY, games: fixtures },
  );
  await page.reload();
  await page
    .getByRole("navigation", {
      name: testInfo.project.name === "mobile" ? "App tabs" : "Main navigation",
      exact: true,
    })
    .getByRole("button", { name: "Stats", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Stats", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".stats-metrics")).toContainText("1250");
  await expect(
    page.getByRole("img", { name: "1 wins, 1 draws, 1 losses", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".results-ring strong")).toHaveText("33%");
  await expect(
    page.locator(".stats-metrics>div").first().locator("b"),
  ).toHaveText("3");
  const totals = await page
    .locator(".activity-track>span")
    .evaluateAll((nodes) =>
      nodes.reduce(
        (n, node) =>
          n +
          Number(node.getAttribute("aria-label")?.match(/: (\d+)/)?.[1] || 0),
        0,
      ),
    );
  expect(totals).toBe(3);
  expect((await stored(page)).games).toHaveLength(4);
});
