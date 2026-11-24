import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { Chess } from "chess.js";
const squares = (page: any) =>
  page
    .getByRole("group", { name: "Chessboard", exact: true })
    .first()
    .locator(".board-square");

test("puzzles hide turn/status text and move history until the first answer, with compact aligned panels", async ({
  page,
  isMobile,
}) => {
  const puzzles = JSON.parse(
    fs.readFileSync("public/data/puzzles.json", "utf8"),
  );
  const puzzle = puzzles.find((p: any) => {
    const c = new Chess(p.fen);
    c.move(p.moves[0]);
    return c.turn() === "b" && p.moves.length >= 4;
  });
  await page.route("**/data/puzzles.json", (r) =>
    r.fulfill({ json: [puzzle] }),
  );
  await page.goto("/#puzzles");
  await expect(
    page.getByRole("group", { name: "Chessboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Puzzle move", { exact: true })).toHaveCount(0);
  await expect(squares(page).last()).toHaveAttribute("aria-label", /^a8,/);
  await expect(
    page.getByText(/Black to move|White to move|In progress/),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Moves", exact: true }),
  ).toHaveCount(0);
  if (!isMobile) {
    const board = (await page.locator(".puzzle-board .board").boundingBox())!;
    const panels = (await page
      .locator(".puzzle-layout .side-panels")
      .boundingBox())!;
    expect(board.width).toBeGreaterThan(550);
    expect(panels.width).toBeLessThanOrEqual(310);
  }
  const c = new Chess(puzzle.fen);
  c.move(puzzle.moves[0]);
  const answer = c.move(puzzle.moves[1]);
  for (const sq of [answer.from, answer.to])
    await page
      .getByRole("group", { name: "Chessboard", exact: true })
      .getByRole("button", { name: new RegExp("^" + sq + ",") })
      .click();
  await expect(
    page.getByRole("heading", { name: "Moves", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".puzzle-moves")).toContainText(answer.san);
});

test("black-to-move positions face the mover in Analysis and Guess the Eval, and the player in Library", async ({
  page,
}) => {
  const c = new Chess();
  c.move("e4");
  const fen = c.fen();
  await page.addInitScript(
    (fen) =>
      localStorage.setItem(
        "novachess-library-v2",
        JSON.stringify({
          games: [
            {
              id: "black-start",
              title: "Black to play",
              created: Date.now(),
              initial: fen,
              variant: "chess",
              moves: [],
              notation: [],
              positions: [fen],
              result: "*",
              human: "w",
              folder: "Studies",
            },
          ],
        }),
      ),
    fen,
  );
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + fen));
  await expect(squares(page).last()).toHaveAttribute("aria-label", /^a8,/);
  const puzzle = JSON.parse(
    fs.readFileSync("public/data/puzzles.json", "utf8"),
  ).find((p: any) => p.fen.split(" ")[1] === "b");
  await page.route("**/data/puzzles.json", (r) =>
    r.fulfill({ json: [puzzle] }),
  );
  await page.goto("/#puzzles/eval");
  await expect(squares(page).last()).toHaveAttribute("aria-label", /^a8,/);
  await page.goto("/#library/black-start");
  await expect(squares(page).last()).toHaveAttribute("aria-label", /^h1,/);
});
