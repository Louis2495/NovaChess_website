import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { Chess } from "chess.js";
const board = (page: any) =>
  page.getByRole("group", { name: "Chessboard", exact: true }).first();
const sq = (page: any, s: string) =>
  board(page).getByRole("button", { name: new RegExp("^" + s + ",") });
async function move(p: any, s: string) {
  await sq(p, s.slice(0, 2)).click();
  await sq(p, s.slice(2, 4)).click();
}
test("Research keeps a running request across navigation and weights its move arrows", async ({
  page,
}) => {
  let requests = 0,
    release!: () => void;
  const waiting = new Promise<void>((r) => (release = r));
  await page.route("https://api.chess.com/pub/player/vet/games/archives", (r) =>
    r.fulfill({
      json: {
        archives: ["https://api.chess.com/pub/player/vet/games/2025/01"],
      },
    }),
  );
  await page.route(
    "https://api.chess.com/pub/player/vet/games/2025/01",
    async (r) => {
      requests++;
      await waiting;
      await r.fulfill({
        json: {
          games: ["1. e4 e5 1-0", "1. e4 c5 1-0", "1. d4 d5 0-1"].map(
            (score, i) => ({
              rules: "chess",
              pgn: `[White "vet"]\n[Black "Other"]\n[Result "${i === 2 ? "0-1" : "1-0"}"]\n\n${score}`,
            }),
          ),
        },
      });
    },
  );
  await page.goto("/#research");
  await page.getByLabel("Public username").fill("vet");
  await page.getByRole("button", { name: "Load games", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.evaluate(() => (location.hash = "#learn"));
  await expect(
    page.getByRole("heading", { name: "Learn", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (location.hash = "#research"));
  await expect(page.getByLabel("Public username")).toHaveValue("vet");
  await expect(page.getByLabel("Loading games")).toBeVisible();
  release();
  await expect(page.getByRole("status")).toContainText("3 games loaded");
  expect(requests).toBe(1);
  await expect(page.locator(".board-marks line")).toHaveCount(2);
  await expect(page.locator(".board-marks text")).toHaveCount(0);
  const widths = await page
    .locator(".board-marks line")
    .evaluateAll((es) => es.map((e) => Number(e.getAttribute("stroke-width"))));
  expect(widths[0]).toBe(widths[1]);
  const opacity = await page
    .locator(".board-marks g")
    .evaluateAll((es) => es.map((e) => Number(e.getAttribute("opacity"))));
  expect(opacity[0]).toBeGreaterThan(opacity[1]);
  await sq(page, "e4").click({ button: "right" });
  await expect(page.locator(".board-square[data-annotation]")).toHaveCount(1);
  await expect(page.locator(".board-marks line")).toHaveCount(2);
});
test("trivia has a real question, separated clue and a spaced next action", async ({
  page,
}) => {
  await page.goto("/#learn/trivia");
  await expect(page.locator(".trivia-question h2")).toHaveText(/\?$/);
  await expect(page.locator(".trivia-options>button")).toHaveCount(4);
  await page.locator(".trivia-options>button").first().click();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".trivia-next")
      .evaluate((e) => parseInt(getComputedStyle(e).marginTop)),
  ).toBeGreaterThanOrEqual(28);
});
test("Profile owns controls, default pawn and keyboard focus mode", async ({
  page,
}) => {
  await page.goto("/#profile");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Profile", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Use .* avatar/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Controls", exact: true }).click();
  await expect(
    page.locator(".control-row").filter({ hasText: "Focus mode" }),
  ).toBeVisible();
  await page.evaluate(() => (location.hash = "#analysis"));
  await expect(board(page)).toBeVisible();
  await page.keyboard.press("z");
  await expect(page.locator(".app")).toHaveClass(/focus-mode/);
  await expect(page.locator(".sidebar")).not.toBeVisible();
  await move(page, "e2e4");
  await expect(sq(page, "e4")).toHaveAttribute("aria-label", /white pawn/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".app")).not.toHaveClass(/focus-mode/);
});
test("opening workbooks and trap defenses are interactive", async ({
  page,
}) => {
  await page.goto("/#learn/lessons");
  await page.getByRole("button", { name: "Browse openings" }).click();
  await page.locator(".opening-row").first().click();
  await page.getByRole("button", { name: "Decisions", exact: true }).click();
  await page
    .getByRole("button", { name: "Try the position", exact: true })
    .click();
  const books = JSON.parse(
    fs.readFileSync("public/data/opening-workbooks.json", "utf8"),
  );
  const w = books[0];
  const c = new Chess();
  for (const m of w.moves.slice(0, w.challenge)) c.move(m);
  const expected = c.move(w.moves[w.challenge]);
  await move(page, expected.from + expected.to);
  await expect(
    page.getByRole("status").filter({ hasText: "Correct." }),
  ).toBeVisible();
  await page.evaluate(() => (location.hash = "#learn/traps"));
  await page.getByRole("button", { name: "Browse traps" }).click();
  await expect(page.locator(".trap-list button")).toHaveCount(20);
  await expect(page.getByText("Open games", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Find the defense", exact: true })
    .click();
  await move(page, "g7g6");
  await expect(
    page.getByRole("status").filter({ hasText: /Correct/ }),
  ).toBeVisible();
});
test("puzzles show a clean rating, readable themes and a Hint button that matches the sidebar", async ({
  page,
}) => {
  await page.goto("/#puzzles");
  await expect(page.locator(".puzzle-rating")).toHaveText(/^\d+$/);
  await expect(
    page.getByText(
      /Your training|Puzzle estimate|Your solution appears|Adaptive training/,
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Original game" })).toHaveCount(
    0,
  );
  await page.locator('.puzzle-theme-picker summary').click();
  const options = await page.getByRole('option').allTextContents();
  await page.locator('.puzzle-theme-picker summary').click();
  expect(options.every((t) => !/[a-z][A-Z]/.test(t))).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toHaveCSS("background-color", "rgb(54, 83, 106)");
});
test("consecutive premoves preview a piece through three moves and execute in order", async ({
  page,
}) => {
  // Deterministic legal replies keep the knight available while exercising the queue.
  await page.route("**/engine/stockfish-19-lite-single.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `let fen='';self.onmessage=({data})=>{if(data==='uci')postMessage('uciok');else if(data==='isready')postMessage('readyok');else if(data.startsWith('position fen '))fen=data.slice(13);else if(data.startsWith('go ')){const ranks=fen.split(' ')[0].split('/');const move=ranks[1].startsWith('p')?'a7a6':ranks[2].startsWith('p')?'a6a5':'b7b6';setTimeout(()=>postMessage('bestmove '+move),2200);}};`,
    }),
  );
  await page.goto("/#play");await page.getByRole("button",{name:"Computer",exact:true}).click();
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await move(page, "e2e4");
  await move(page, "g1f3");
  await move(page, "f3g5");
  await move(page, "g5f3");
  await expect(page.locator(".premove-queue")).toContainText("g5f3");
  await expect(sq(page, "f3")).toHaveAttribute("aria-label", /white knight/);
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          JSON.parse(
            localStorage.getItem("novachess-library-v2")!,
          ).activeGame.moves.filter((_: string, i: number) => i % 2 === 0),
        ),
      { timeout: 20000 },
    )
    .toEqual(["e2e4", "g1f3", "f3g5", "g5f3"]);
  await expect(page.locator(".board-premove-marker")).toHaveCount(0);
});
