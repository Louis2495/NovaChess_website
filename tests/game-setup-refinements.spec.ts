import { test, expect } from "@playwright/test";

test("picked-up pieces center on the pointer immediately and drop on the square under their center", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const board = page.getByRole("group", { name: "Chessboard", exact: true });
  const from = (await board
    .getByRole("button", { name: /^e2,/ })
    .boundingBox())!;
  const destination = board.getByRole("button", { name: /^e4,/ });
  const x = from.x + 2,
    y = from.y + 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const picked = (await page.locator(".drag-piece").boundingBox())!;
  expect(Math.abs(picked.x + picked.width / 2 - x)).toBeLessThan(1);
  expect(Math.abs(picked.y + picked.height / 2 - y)).toBeLessThan(1);
  // Release off-center with more than half of the dragged piece over e4.
  const to = (await destination.boundingBox())!;
  await page.mouse.move(to.x + to.width * .85, to.y + to.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator(".notation-table")).toContainText("e4");
});

test("game setup offers two strength choices, defaults to rated, searches openings and centers standalone resume actions", async ({
  page,
}) => {
  await page.goto("/#play");await page.getByRole("button",{name:"Computer",exact:true}).click();
  await expect(page.getByRole("button", { name: "Game options", exact: true })).toHaveCount(0);
  await expect(page.locator(".opponent-choices input")).toHaveCount(2);
  await expect(page.getByLabel("Current rating")).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^Rated/ })).toBeChecked();
  await expect(
    page.getByText(/Adaptive|Play the Developer|Rated locally/),
  ).toHaveCount(0);
  const options = (await page.locator(".game-settings-card").boundingBox())!;
  expect(options.width).toBeLessThanOrEqual(540);
  const opening=page.getByRole("combobox",{name:"Request an opening",exact:true});
  await opening.fill("Sicilian");
  const optionsList=page.getByRole("listbox",{name:"Openings",exact:true});
  await expect(optionsList.getByRole("option").first()).toContainText("Sicilian");
  const names=await optionsList.getByRole("option").allTextContents();
  expect(names.every(n=>/Sicilian/i.test(n))).toBeTruthy();
  await optionsList.getByRole("option").first().click();
  await expect(opening).toHaveValue(/Sicilian/);
  await page.getByLabel("Custom", { exact: true }).check();
  await page.getByLabel("Rating", { exact: true }).fill("1500");
  const random = page.getByRole("group", { name: "Your color" }).getByRole("button", { name: "Random", exact: true });
  await random.click();
  await expect(random).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => { Math.random = () => 0.9; });
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
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("novachess-library-v2") || "{}").activeGame?.human,
  )).toBe("b");
  await page.goto("/#home");
  for (const route of ["home", "play"]) {
    await page.goto("/#" + route);
    if(route === "play")await page.getByRole("button",{name:"Computer",exact:true}).click();
    const resume = page.getByRole("button", {
      name: "Resume saved game",
      exact: true,
    });
    await expect(resume).toHaveCSS("background-color", "rgb(193, 173, 239)");
    const section = page.locator(".new-game-section");
    await expect(section).toHaveCSS("background-image", "none");
    const r = (await resume.boundingBox())!,
      s = (await (route === "home" ? page.locator(".home-welcome-actions") : section).boundingBox())!;
    expect(Math.abs(r.x + r.width / 2 - s.x - s.width / 2)).toBeLessThan(2);
    expect(r.width).toBeLessThan(280);
  }
});

test("desktop meme uses a white frame beside the puzzle, and Analysis starts at a screen-friendly board size", async ({
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
  expect(Math.abs(puzzle.y+puzzle.height/2-meme.y-meme.height/2)).toBeLessThan(2);
  await expect(page.locator('.daily-meme-image')).toHaveCSS('object-fit','contain');
  await expect(page.locator('.daily-meme')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await page.goto("/#analysis");
  const board = (await page.locator(".analysis-layout .board").boundingBox())!;
  const panels = (await page
    .locator(".analysis-layout .side-panels")
    .boundingBox())!;
  expect(board.width).toBeGreaterThan(600);
  expect(board.y + board.height).toBeLessThan((await page.viewportSize())!.height - 50);
  expect(panels.width).toBeGreaterThan(280);
});
