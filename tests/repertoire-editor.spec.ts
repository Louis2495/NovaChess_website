import { expect, test, type Page } from "@playwright/test";

async function move(page: Page, from: string, to: string) {
  const board = page.getByRole("group", { name: "Chessboard", exact: true });
  await board.getByRole("button", { name: new RegExp(`^${from},`) }).click();
  await board.getByRole("button", { name: new RegExp(`^${to},`) }).click();
}

test("the repertoire editor adds, navigates and trains a sideline", async ({ page }) => {
  await page.goto("/#learn/repertoire");
  await page.getByRole("button", { name: "Add line", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add repertoire line" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Line name").fill("Two first moves");
  await move(page, "e2", "e4");
  await move(page, "e7", "e5");
  const main = page.getByRole("table", { name: "Main line" });
  await expect(main.getByRole("columnheader", { name: "White", exact: true })).toBeVisible();
  await expect(main.getByRole("columnheader", { name: "Black", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start position" }).click();
  await move(page, "d2", "d4");
  await move(page, "d7", "d5");
  await expect(page.getByRole("table", { name: /Sideline.*d4/ }).getByRole("button", { name: "d5" })).toBeVisible();
  await main.getByRole("button", { name: "e5", exact: true }).click();
  await expect(page.getByRole("button", { name: "e5, black pawn", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save line", exact: true }).click();
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await move(page, "d2", "d4");
  await expect(page.locator(".feedback")).toContainText("Line completed");
});

test("Lichess study import saves multiple chapters, their orientation and nested sidelines", async ({ page }) => {
  await page.route("https://lichess.org/api/study/abc123DE.pgn?clocks=false", r => r.fulfill({
    contentType: "application/x-chess-pgn",
    body: '[Event "Study: Open game"]\n[Orientation "Black"]\n\n1. e4 e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3 *\n\n[Event "Study: Queen pawn"]\n\n1. d4 d5 *',
  }));
  await page.goto("/#learn/repertoire");
  await page.getByRole("button", { name: "Import Lichess study", exact: true }).click();
  await page.getByLabel("Lichess study link").fill("https://lichess.org/study/abc123DE/abc123XY");
  await page.getByRole("button", { name: "Import study", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Study: Queen pawn" })).toBeVisible();
  const opening = page.locator(".repertoire-grid .card").filter({ hasText: "Study: Open game" });
  await expect(opening.getByText("Black", { exact: true })).toBeVisible();
  await opening.getByRole("button", { name: "Edit", exact: true }).click();
  const nested = page.getByRole("table", { name: /Sideline.*c3/ });
  await nested.getByRole("button", { name: "c3", exact: true }).click();
  await expect(page.getByRole("button", { name: "c3, white pawn", exact: true })).toBeVisible();
});
