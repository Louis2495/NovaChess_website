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
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Study link").fill("https://lichess.org/study/abc123DE/abc123XY");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Study: Queen pawn" })).toBeVisible();
  const opening = page.locator(".repertoire-grid .card").filter({ hasText: "Study: Open game" });
  await expect(opening.getByText("Black", { exact: true })).toBeVisible();
  await opening.getByRole("button", { name: "Edit", exact: true }).click();
  const nested = page.getByRole("table", { name: /Sideline.*c3/ });
  await nested.getByRole("button", { name: "c3", exact: true }).click();
  await expect(page.getByRole("button", { name: "c3, white pawn", exact: true })).toBeVisible();
});

test("saved lines are grouped by their opening even when they have custom names", async ({ page }) => {
  await page.addInitScript(() => {
    const line = {
      initial: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      side: "w", due: Date.now(), trained: 0, successes: 0,
    };
    localStorage.setItem("novachess-library-v2", JSON.stringify({
      repertoire: [
        { ...line, id: "one", name: "First draft", moves: ["e2e4", "c7c5"] },
        { ...line, id: "two", name: "A different defense", moves: ["e2e4", "e7e6"] },
        { ...line, id: "three", name: "My tournament line", moves: ["e2e4", "c7c5", "g1f3", "d7d6"] },
      ],
    }));
  });
  await page.goto("/#learn/repertoire");
  const sicilian = page.getByRole("region", { name: "Sicilian Defense", exact: true });
  await expect(sicilian.getByRole("heading", { level: 3 })).toHaveText(["First draft", "My tournament line"]);
  await expect(page.getByRole("region", { name: "French Defense", exact: true })).toContainText("A different defense");
});

test("repertoire filters reviews and checks saved sidelines before suggesting missing lines", async ({ page }) => {
  const { readFileSync } = await import("node:fs");
  const foundation = JSON.parse(readFileSync("public/data/lessons.json", "utf8"))
    .find((line: { name: string }) => line.name === "Sicilian Defense: Core plans");
  await page.addInitScript(moves => {
    const line = {
      initial: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      trained: 0, successes: 0, moves: ["e2e4", "c7c5"],
    };
    localStorage.setItem("novachess-library-v2", JSON.stringify({
      repertoire: [
        { ...line, id: "one", name: "White example", side: "w", due: Date.now() + 60000 },
        { ...line, id: "two", name: "Black example", side: "b", due: 0, branches: [moves] },
      ],
    }));
  }, foundation.moves);
  await page.goto("/#learn/repertoire");
  const sicilian = page.getByRole("region", { name: "Sicilian Defense", exact: true });
  await expect(sicilian).toBeVisible();
  const workspace = (await page.locator("#workspace").boundingBox())!;
  const toggle = page.getByRole("group", { name: "Repertoire color" });
  const buttons = (await toggle.boundingBox())!;
  const section = (await sicilian.boundingBox())!;
  expect(buttons.y).toBeLessThan(section.y);
  expect(buttons.x + buttons.width / 2).toBeCloseTo(workspace.x + workspace.width / 2, 0);
  expect(section.x + section.width / 2).toBeCloseTo(workspace.x + workspace.width / 2, 0);
  await sicilian.getByText("Hide lines", { exact: true }).click();
  await expect(sicilian.getByText("White example")).toBeHidden();
  await sicilian.getByText("Show lines", { exact: true }).click();
  await sicilian.getByText(/Suggested lines to add/).click();
  await expect(sicilian.getByRole("button", { name: "Sicilian Defense: Core plans", exact: true })).toHaveCount(0);
  await page.getByRole("group", { name: "Repertoire color" }).getByRole("button", { name: "White", exact: true }).click();
  await expect(sicilian.getByRole("button", { name: "Sicilian Defense: Core plans", exact: true })).toBeVisible();
  await page.getByRole("group", { name: "Review status" }).getByRole("button", { name: "Due for review", exact: true }).click();
  await expect(page.getByText("No repertoire lines match these filters.")).toBeVisible();
  await page.getByRole("group", { name: "Repertoire color" }).getByRole("button", { name: "Black", exact: true }).click();
  await expect(sicilian.getByText("Black example")).toBeVisible();
});

test("opening categories can be dragged, moved with buttons, and renamed across reloads", async ({ page }) => {
  await page.addInitScript(() => {
    const storageKey = "novachess-library-v2";
    if (localStorage.getItem(storageKey)) return;
    const line = {
      initial: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      side: "w", due: 0, trained: 0, successes: 0,
    };
    localStorage.setItem(storageKey, JSON.stringify({
      repertoire: [
        { ...line, id: "one", name: "My Sicilian line", moves: ["e2e4", "c7c5"] },
        { ...line, id: "two", name: "My French line", moves: ["e2e4", "e7e6"] },
      ],
    }));
  });
  await page.goto("/#learn/repertoire");
  const headings = page.locator(".repertoire-family-name");
  await expect(headings).toHaveText(["French Defense", "Sicilian Defense"]);
  await page.getByRole("button", { name: "Manage categories" }).click();
  const manager = page.getByRole("region", { name: "Manage opening categories" });
  const labels = manager.locator(".repertoire-category-name");
  await manager.getByRole("button", { name: "Move Sicilian Defense up" }).click();
  await expect(labels).toHaveText(["Sicilian Defense", "French Defense"]);
  if (!(await page.evaluate(() => navigator.maxTouchPoints))) {
    const rows = manager.getByRole("listitem");
    await rows.first().locator(".repertoire-category-grip").dragTo(rows.last());
    await expect(labels).toHaveText(["French Defense", "Sicilian Defense"]);
    await manager.getByRole("button", { name: "Move French Defense down" }).click();
  }
  await manager.getByRole("button", { name: "Rename Sicilian Defense" }).click();
  await manager.getByRole("textbox", { name: "Category name" }).fill("Tournament prep");
  await manager.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(headings).toHaveText(["Tournament prep", "French Defense"]);
  await page.reload();
  await expect(headings).toHaveText(["Tournament prep", "French Defense"]);
  await page.getByRole("searchbox", { name: "Search repertoire" }).fill("tournament");
  const renamed = page.getByRole("region", { name: "Tournament prep" });
  await expect(renamed.getByRole("heading", { name: "My Sicilian line" })).toBeVisible();
  await expect(renamed.getByText(/Suggested lines to add/)).toBeVisible();
});
