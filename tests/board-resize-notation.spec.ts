import { test, expect } from "@playwright/test";
test("Analysis starts small enough for the screen and supports dragging, keyboard resizing and persisted size", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const board = page.locator(".analysis-layout .board");
  const before = (await board.boundingBox())!;
  expect(before.width).toBeLessThanOrEqual(540);
  expect(before.y + before.height).toBeLessThan(
    (await page.viewportSize())!.height - 50,
  );
  const handle = page.getByRole("slider", {
    name: "Resize board",
    exact: true,
  });
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 - 50, h.y + h.height / 2 + 50, {
    steps: 6,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await board.boundingBox())!.width)
    .toBeLessThan(before.width - 35);
  await handle.focus();
  const small = (await board.boundingBox())!.width;
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => (await board.boundingBox())!.width)
    .toBeGreaterThan(small + 10);
  const saved = (await board.boundingBox())!.width;
  await page.reload();
  await expect
    .poll(async () => (await board.boundingBox())!.width)
    .toBeCloseTo(saved, 0);
});
test("boards can be resized in puzzles, play and readonly quizzes, and only Blindfold text offers typed moves", async ({
  page,
}) => {
  for (const route of ["puzzles", "play", "learn/quizzes"]) {
    await page.goto("/#" + route);
    if (route === "play")
      await page
        .getByRole("button", { name: "Start game", exact: true })
        .click();
    if (route === "learn/quizzes")
      await page.getByRole("button", { name: /Your chess style/ }).click();
    const handle = page
      .getByRole("slider", { name: "Resize board", exact: true })
      .first();
    await expect(handle).toBeVisible();
    await handle.focus();
    const before = Number(await handle.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
      .toBeLessThan(before - 10);
    await expect(page.getByLabel("Puzzle move", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByLabel("Enter analysis move", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Blindfold move", { exact: true }),
    ).toHaveCount(0);
  }
  await page.goto("/#analysis");
  expect(
    (await page.locator(".analysis-layout .board").boundingBox())!.width,
  ).toBeLessThanOrEqual(540);
  await page.goto("/#variants");
  await page.getByRole("button", { name: "Game options", exact: true }).click();
  await page.getByLabel("Variant", { exact: true }).selectOption("blindtext");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  const input = page.getByLabel("Blindfold move", { exact: true });
  await expect(input).toBeVisible();
  await input.fill("e4");
  await input.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("novachess-library-v2") || "{}")
            .activeGame.moves.length,
      ),
    )
    .toBeGreaterThan(0);
});
test("top lines have individual White/Black move tables, including Black-to-play positions", async ({
  page,
  isMobile,
}) => {
  await page.route("**/engine/stockfish-19-lite-single.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `onmessage=({data})=>{if(data==='uci')postMessage('uciok');if(data==='isready')postMessage('readyok');if(data.startsWith('go '))for(let n=1;n<=3;n++)postMessage('info depth 10 multipv '+n+' score cp 20 pv e7e5 g1f3 b8c6')}`,
    }),
  );
  await page.goto(
    "/#analysis/" +
      encodeURIComponent(
        "fen:rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      ),
  );
  const tables = page.locator(".engine-line table");
  await expect(tables).toHaveCount(3);
  await expect(
    tables.first().getByRole("columnheader", { name: "White", exact: true }),
  ).toBeVisible();
  await expect(
    tables.first().locator("tbody tr").first().locator("td").nth(1),
  ).toHaveText("—");
  await expect(
    tables.first().locator("tbody tr").first().locator("td").nth(2),
  ).toHaveText("e5");
  if (!isMobile) {
    const a = (await tables.nth(0).boundingBox())!,
      b = (await tables.nth(1).boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(a.x);
  }
});
