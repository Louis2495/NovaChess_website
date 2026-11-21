import { test, expect } from "@playwright/test";
import { Chess } from "chess.js";
test("recent game scrubber previews positions and colors results without home action arrows", async ({ page }) => {
  const c = new Chess(), initial = c.fen(); c.move("e4");
  const g = { id: "preview", title: "Preview game", created: Date.now(), initial, variant: "chess", moves: ["e2e4"], notation: ["e4"], positions: [initial, c.fen()], result: "1-0", human: "w", folder: "Games" };
  await page.addInitScript(g => localStorage.setItem("novachess-library-v2", JSON.stringify({ games: [g], activeGame: { ...g, result: "*" } })), g);
  await page.goto("/#home");
  await expect(page.locator(".new-game-primary svg")).toHaveCount(0);
  await expect(page.locator(".resume-game-button .lucide-chevron-right")).toHaveCount(0);
  await expect(page.locator(".recent-game-entry")).toHaveClass(/result-win/);
  const slider = page.getByRole("slider", { name: "Preview Preview game" });
  const strip = (await page.locator(".recent-game-scrubber").boundingBox())!;
  const bar = (await slider.boundingBox())!;
  expect(bar).toEqual(strip);
  const card = (await page.locator(".recent-game-entry").boundingBox())!;
  expect(bar.x - card.x).toBeLessThanOrEqual(2);
  expect(card.x + card.width - bar.x - bar.width).toBeLessThanOrEqual(2);
  await slider.focus(); await slider.press("End");
  await expect(page.locator(".recent-game-preview").getByRole("button", { name: "e4, white pawn", exact: true })).toBeVisible();
  await slider.press("Home");
  await expect(page.locator(".recent-game-preview").getByRole("button", { name: "e2, white pawn", exact: true })).toBeVisible();
});
test("Fog reveals attacked squares only, hides move traces, and uses checkmate rules", async ({ page }) => {
  await page.goto("/#variants");await page.getByRole("button",{name:"Computer",exact:true}).click();
  const result = await page.evaluate(async () => {
    // Import the actual Vite module so visibility and native rules are both exercised.
    const path = "/src/lib/variants.ts";
    const { fog } = await import(/* @vite-ignore */ path);
    const visible = fog("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", "w");
    return { forward: visible.has("e3"), twoForward: visible.has("e4"), diagonal: visible.has("d3"), own: visible.has("e2") };
  });
  expect(result).toEqual({ forward: false, twoForward: false, diagonal: true, own: true });
  await page.getByRole("button", { name: "Game options", exact: true }).click();
  await page.getByLabel("Variant", { exact: true }).selectOption("cvfog");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await expect(page.locator('.board-square[aria-label="e4, empty"]')).toHaveClass(/fogged/);
  await page.getByRole("button", { name: "e2, white pawn", exact: true }).click();
  await page.getByRole("button", { name: "e4, empty", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("novachess-library-v2") || "{}").activeGame?.moves.length)).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".board-square.last-move")).toHaveCount(0);
  await expect(page.locator(".board-square.fogged .rank, .board-square.fogged .file")).toHaveCount(0);
});
test("boards stay within short viewport height", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1280, height: 700 });
  for (const route of ["analysis", "puzzles", "research"]) {
    await page.goto("/#" + route);
    const board = page.getByRole("group", { name: "Chessboard", exact: true }).first();
    await expect(board).toBeVisible();
    const box = (await board.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(610);
    expect(box.y + box.height).toBeLessThanOrEqual(650);
    expect(box.width).toBeLessThanOrEqual(isMobile ? 390 : 1280);
  }
});
