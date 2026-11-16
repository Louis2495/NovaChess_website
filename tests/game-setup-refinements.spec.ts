import { test, expect } from "@playwright/test";

test("picked-up pieces center on the pointer immediately and drop on the square under their center", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const board = page.getByRole("group", { name: "Chessboard", exact: true });
  const from = (await board
    .getByRole("button", { name: /^e2,/ })
    .boundingBox())!;
  const to = (await board.getByRole("button", { name: /^e4,/ }).boundingBox())!;
  const x = from.x + 2,
    y = from.y + 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const picked = (await page.locator(".drag-piece").boundingBox())!;
  expect(Math.abs(picked.x + picked.width / 2 - x)).toBeLessThan(1);
  expect(Math.abs(picked.y + picked.height / 2 - y)).toBeLessThan(1);
  // Pick up in the top-left corner, then release near e4's right edge.
  // Retaining the pickup offset would incorrectly drop on f4.
  await page.mouse.move(to.x + to.width - 2, to.y + to.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator(".notation-table")).toContainText("e4");
});

test("game setup offers two strength choices, defaults to rated, searches openings and centers standalone resume actions", async ({
  page,
}) => {
  await page.goto("/#play");
  await page.getByRole("button", { name: "Game options", exact: true }).click();
  await expect(page.locator(".opponent-choices input")).toHaveCount(2);
  await expect(page.getByLabel("Current rating")).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^Rated/ })).toBeChecked();
  await expect(
    page.getByText(/Adaptive|Play the Developer|Rated locally/),
  ).toHaveCount(0);
  const options = (await page.locator(".game-settings-card").boundingBox())!;
  expect(options.width).toBeLessThanOrEqual(540);
  await page.getByLabel("Search openings", { exact: true }).fill("Sicilian");
  const opening = page.getByLabel("Request an opening", { exact: true });
  await expect.poll(() => opening.locator("option").count()).toBeGreaterThan(1);
  const names = await opening.locator("option").allTextContents();
  expect(names.slice(1).every((n) => /Sicilian/i.test(n))).toBeTruthy();
  await opening.selectOption({ index: 1 });
  await page.getByLabel("Custom", { exact: true }).check();
  await page.getByLabel("Strength target (approximate)").fill("1500");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("novachess-library-v2") || "{}")
            .activeGame?.rated,
      ),
    )
    .toBe(true);
  await page.goto("/#home");
  for (const route of ["home", "play"]) {
    await page.goto("/#" + route);
    const resume = page.getByRole("button", {
      name: "Resume saved game",
      exact: true,
    });
    await expect(resume).toHaveCSS("background-color", "rgb(193, 173, 239)");
    const section = page.locator(".new-game-section");
    await expect(section).toHaveCSS("background-image", "none");
    const r = (await resume.boundingBox())!,
      s = (await section.boundingBox())!;
    expect(Math.abs(r.x + r.width / 2 - s.x - s.width / 2)).toBeLessThan(2);
    expect(r.width).toBeLessThan(280);
  }
});

test("desktop daily puzzle and meme share their top and bottom, and Analysis gives more space to the board", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Side-by-side layout applies to desktop.");
  await page.goto("/");
  await page
    .locator(".daily-meme-image")
    .evaluate((image: HTMLImageElement) => image.decode());
  const puzzle = (await page.locator(".home-puzzle").boundingBox())!,
    meme = (await page.locator(".daily-meme").boundingBox())!;
  expect(Math.abs(puzzle.y - meme.y)).toBeLessThan(1);
  expect(Math.abs(puzzle.height - meme.height)).toBeLessThan(1);
  await page.goto("/#analysis");
  const board = (await page.locator(".analysis-layout .board").boundingBox())!;
  const panels = (await page
    .locator(".analysis-layout .side-panels")
    .boundingBox())!;
  expect(board.width).toBeGreaterThan(600);
  expect(panels.width).toBeLessThanOrEqual(340);
});
