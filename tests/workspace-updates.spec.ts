import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { Chess } from "chess.js";
const libraryKey = "novachess-library-v2";
test("notation follows the current move, respects manual scrolling, and can resume following", async ({
  page,
}) => {
  const game = JSON.parse(
    fs.readFileSync("public/data/famous-games.json", "utf8"),
  )[0];
  await page.addInitScript(
    ({ key, game }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          analysis: {
            id: "analysis",
            title: "Replay",
            created: Date.now(),
            initial: game.positions[0],
            variant: "chess",
            moves: game.moves,
            notation: game.notation,
            positions: game.positions,
            result: "*",
            human: "w",
            folder: "Studies",
          },
        }),
      );
    },
    { key: libraryKey, game },
  );
  await page.goto("/#analysis");
  await page.getByRole("button", { name: "Notation", exact: true }).click();
  const list = page.getByLabel("Game notation", { exact: true });
  await expect.poll(() => list.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "First position", exact: true })
    .click();
  await expect.poll(() => list.evaluate((e) => e.scrollTop)).toBe(0);
  await page
    .getByRole("button", { name: "Last position", exact: true })
    .click();
  await expect.poll(() => list.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  await list.dispatchEvent("wheel", { deltaY: -1000 });
  await list.evaluate((e) => (e.scrollTop = 0));
  await page.keyboard.press("ArrowLeft");
  await expect(list).toHaveJSProperty("scrollTop", 0);
  await page
    .getByRole("button", { name: "Follow current move", exact: true })
    .click();
  await expect.poll(() => list.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
});
test("analysis explains positions, has a separate large evaluation and a compact spaced navigation bar", async ({
  page,
}) => {
  const c = new Chess();
  for (const m of ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"]) c.move(m);
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + c.fen()));
  await expect(page.locator(".positional-insights")).toContainText(
    /knight on c3 is pinned/,
  );
  await expect(page.locator(".positional-insights")).not.toContainText(
    /Material:|legal moves available|Material is balanced/,
  );
  await expect(page.locator(".eval-meter>span")).toHaveCount(0);
  expect(
    await page
      .locator(".evaluation-readout")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThan(25);
  const study = page.locator(".side-panels>.card").filter({
    has: page.getByRole("heading", { name: "Top lines", exact: true }),
  });
  await expect(study.locator(".card-heading svg")).toHaveCount(0);
  await expect(
    study.getByRole("button", { name: "Set up a position", exact: true }),
  ).toHaveCount(0);
  await expect(study).not.toContainText("Go back and play");
  const bar = page.locator(".analysis-navigation"),
    board = page.getByRole("group", { name: "Chessboard", exact: true });
  const box = (await bar.boundingBox())!,
    bb = (await board.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(48);
  expect(box.y - bb.y - bb.height).toBeGreaterThanOrEqual(20);
  const black = c.fen().replace(" w ", " b ");
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + black));
  await expect(
    page.getByRole("img", { name: "Black turn", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Black to move", { exact: true })).toHaveCount(0);
});
test("puzzle board entry and reply notation work while the puzzle controls align with the board", async ({
  page,
}) => {
  const puzzle = JSON.parse(
    fs.readFileSync("public/data/puzzles.json", "utf8"),
  ).find((p: any) => p.moves.length >= 6);
  await page.route("**/data/puzzles.json", (r) =>
    r.fulfill({ json: [puzzle] }),
  );
  await page.goto("/#puzzles");
  await expect(page.getByLabel("Puzzle move", { exact: true })).toHaveCount(0);
  const board = page.getByRole("group", { name: "Chessboard", exact: true });
  await expect(board).toBeVisible();
  await expect(page.getByText("0 moves", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(
      /Find the best continuation|Difficulty follows your results/,
    ),
  ).toHaveCount(0);
  if ((await page.viewportSize())!.width > 1000) {
    await expect
      .poll(async () => {
        const a = (await page
            .locator(".puzzle-layout > .side-panels")
            .boundingBox())!,
          b = (await page
            .getByRole("group", { name: "Chessboard", exact: true })
            .boundingBox())!;
        return Math.abs(a.y - b.y);
      })
      .toBeLessThan(2);
  }
  const c = new Chess(puzzle.fen);
  c.move(puzzle.moves[0]);
  const first = c.move(puzzle.moves[1]),
    reply = c.move(puzzle.moves[2]),
    second = c.move(puzzle.moves[3]);
  for (const sq of [first.from, first.to])
    await board
      .getByRole("button", { name: new RegExp("^" + sq + ",") })
      .click();
  await expect(page.locator(".move-chips")).toContainText(reply.san);
  for (const sq of [second.from, second.to])
    await board
      .getByRole("button", { name: new RegExp("^" + sq + ",") })
      .click();
  await expect(page.locator(".move-chips")).toContainText(second.san);
});
test("Stats has configurable activity periods and embeds Rankings with attached federation records", async ({
  page,
}) => {
  await page.goto("/#profile");
  await page
    .getByLabel("FIDE profile", { exact: true })
    .fill("https://ratings.fide.com/profile/1503014");
  await page.getByLabel("FIDE player name").fill("Sample Player");
  await page.getByLabel("FIDE standard rating").fill("2200");
  await page.getByLabel("USCF profile", { exact: true }).fill("12641216");
  await page.getByLabel("USCF regular rating").fill("2300");
  await page
    .getByRole("button", { name: "Save profiles", exact: true })
    .click();
  await page.goto("/#stats");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Rankings", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Stats period").selectOption("30");
  await expect(page.locator(".activity-day")).toHaveCount(30);
  await page.getByLabel("Stats period").selectOption("custom");
  await page.getByLabel("Stats days").fill("45");
  await expect(page.locator(".activity-day")).toHaveCount(23);
  await expect(
    page.getByRole("button", { name: "Train", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  await expect(page.locator(".federation-cards")).toContainText(
    "Sample Player",
  );
  await expect(page.locator(".federation-cards")).toContainText("2200");
  await expect(page.locator(".federation-cards")).toContainText("2300");
  await expect(
    page.getByLabel("FIDE official record", { exact: true }),
  ).toHaveAttribute("href", "https://ratings.fide.com/profile/1503014");
  await page.reload();
  await page.goto("/#rankings");
  await expect(
    page.getByRole("heading", { name: "Stats", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".federation-cards")).toContainText("2300");
});
test("a documented FIDE API response attaches player details and all three ratings", async ({
  page,
}) => {
  await page.route("https://lichess.org/api/fide/player/1503014", (r) =>
    r.fulfill({
      json: {
        id: 1503014,
        name: "Example Player",
        title: "GM",
        federation: "NOR",
        standard: 2800,
        rapid: 2750,
        blitz: 2850,
      },
    }),
  );
  await page.goto("/#profile");
  await page.getByLabel("FIDE profile", { exact: true }).fill("1503014");
  await page
    .getByRole("button", { name: "Load FIDE profile", exact: true })
    .click();
  await expect(page.getByLabel("FIDE player name")).toHaveValue(
    "Example Player",
  );
  await page.goto("/#stats/rankings");
  await expect(page.locator(".federation-cards")).toContainText("GM");
  await expect(page.locator(".federation-cards")).toContainText("2800");
  await expect(page.locator(".federation-cards")).toContainText("2750");
  await expect(page.locator(".federation-cards")).toContainText("2850");
});
