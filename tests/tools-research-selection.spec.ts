import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { Chess } from "chess.js";
const square = (p: any, s: string) =>
  p
    .getByRole("group", { name: "Chessboard", exact: true })
    .first()
    .getByRole("button", { name: new RegExp("^" + s + ",") });
test("analysis keeps all four tools visible in one menu", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const menu = page.getByRole("group", {
    name: "Analysis actions",
    exact: true,
  });
  await expect(menu.getByRole("button")).toHaveCount(4);
  await menu
    .getByRole("button", { name: "Edit position", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Set up position", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await square(page, "e2").click();
  await square(page, "e4").click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(square(page, "e2")).toHaveAttribute(
    "aria-label",
    "e2, white pawn",
  );
  await expect(
    page.getByRole("group", { name: "Analysis actions", exact: true }),
  ).toBeVisible();
});
test("Research source/color toggles align with username and NovaChess explores real local games", async ({
  page,
}) => {
  const c = new Chess(),
    initial = c.fen();
  c.move("e4");
  c.move("e5");
  await page.addInitScript(
    (g) =>
      localStorage.setItem(
        "novachess-library-v2",
        JSON.stringify({
          profile: { name: "Tester", avatar: "", country: "", friends: [] },
          games: [g],
        }),
      ),
    {
      id: "local",
      title: "Local game",
      origin: "novachess",
      kind: "game",
      variant: "chess",
      initial,
      moves: ["e2e4", "e7e5"],
      notation: ["e4", "e5"],
      positions: [initial, c.fen()],
      human: "w",
      result: "1-0",
      folder: "Games",
      created: Date.now(),
    },
  );
  await page.goto("/#research");
  const source = page.getByRole("group", { name: "Source", exact: true }),
    color = page.getByRole("group", { name: "Player’s color", exact: true });
  await expect(source.getByRole("button")).toHaveCount(3);
  await expect(color.getByRole("button")).toHaveCount(2);
  await source.getByRole("button", { name: "NovaChess", exact: true }).click();
  await expect(page.getByLabel("Public username")).toHaveValue("Tester");
  const userBox = (await page.getByLabel("Public username").boundingBox())!,
    colorBox = (await color.boundingBox())!;
  const sourceBox = (await source.boundingBox())!;
  expect(Math.abs(userBox.x - colorBox.x)).toBeLessThan(1);
  expect(Math.abs(userBox.x - sourceBox.x)).toBeLessThan(1);
  expect(sourceBox.y + sourceBox.height).toBeLessThan(userBox.y);
  expect(userBox.y + userBox.height).toBeLessThan(colorBox.y);
  await page.getByRole("button", { name: "Load games", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 games loaded" }),
  ).toBeVisible();
  await expect(page.locator(".research-branches")).toContainText("e4");
  await color.getByRole("button", { name: "Black", exact: true }).click();
  await expect(
    color.getByRole("button", { name: "Black", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("puzzle rating is centered in its card and completion uses only the board outline", async ({
  page,
}) => {
  const puzzle = JSON.parse(
    fs.readFileSync("public/data/puzzles.json", "utf8"),
  ).find((p: any) => p.moves.length === 2);
  await page.route("**/data/puzzles.json", (r) =>
    r.fulfill({ json: [puzzle] }),
  );
  await page.goto("/#puzzles");
  const rating = page.locator(".puzzle-rating");
  await expect(rating).toBeVisible();
  const number = (await rating.boundingBox())!,
    card = (await rating.locator("..").boundingBox())!;
  expect(
    Math.abs(number.x + number.width / 2 - card.x - card.width / 2),
  ).toBeLessThan(1);
  expect(
    Math.abs(number.y + number.height / 2 - card.y - card.height / 2),
  ).toBeLessThan(1);
  const c = new Chess(puzzle.fen);
  c.move(puzzle.moves[0]);
  const m = c.move(puzzle.moves[1]);
  for (const s of [m.from, m.to]) await square(page, s).click();
  await expect(page.locator(".puzzle-board")).toHaveClass(/solved/);
  await expect(page.locator(".puzzle-board .board")).toHaveCSS("outline-color", "rgb(248, 217, 83)");
  await expect(page.locator(".puzzle-board")).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(
    page.getByText(/Solved\.|Completed\. Earlier hints/),
  ).toHaveCount(0);
});
test("returned drops stay selected while right-click cancellation clears selection", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const from = (await square(page, "e2").boundingBox())!,
    invalid = (await square(page, "e5").boundingBox())!;
  for (const cancel of ["invalid", "same", "right"]) {
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      invalid.x + invalid.width / 2,
      invalid.y + invalid.height / 2,
    );
    if (cancel === "same")
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    if (cancel === "right") {
      await page.mouse.down({ button: "right" });
      await page.mouse.up({ button: "right" });
    }
    await page.mouse.up();
    await expect(square(page, "e2")).toHaveAttribute("aria-pressed", cancel === "right" ? "false" : "true");
    await expect(square(page, "e2")).toHaveAttribute(
      "aria-label",
      "e2, white pawn",
    );
  }
  await square(page, "e2").click();
  await square(page, "e4").click();
  await expect(square(page, "e4")).toHaveAttribute(
    "aria-label",
    "e4, white pawn",
  );
});
