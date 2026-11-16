import { test, expect, type Page } from "@playwright/test";
const square = (page: Page, s: string) =>
  page
    .getByRole("group", { name: "Chessboard", exact: true })
    .first()
    .getByRole("button", { name: new RegExp("^" + s + ",") });
async function move(page: Page, m: string) {
  await square(page, m.slice(0, 2)).click();
  await square(page, m.slice(2, 4)).click();
}
test("illustrated modes put Standard first and show distinct artwork for all 18 variants", async ({
  page,
}) => {
  await page.goto("/#play");
  await expect(
    page.getByRole("heading", { name: "Play", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".page-title")).toHaveCount(0);
  const cards = page.locator(".variant-gallery>button");
  await expect(cards).toHaveCount(18);
  await expect(cards.first()).toHaveText("Standard");
  await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
  const tiles = page.locator(".variant-gallery .variant-picture");
  const positions = await tiles.evaluateAll((es) =>
    es.map((e) => getComputedStyle(e).backgroundPosition),
  );
  expect(new Set(positions).size).toBe(18);
  await expect(tiles.first()).toHaveCSS(
    "background-image",
    /illustrations\.webp/,
  );
  expect(
    (await page.request.get("/variants/illustrations.webp")).ok(),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Game options", exact: true }).click();
  await expect(
    page.getByText(/Strength targets are approximate|local search opponent/),
  ).toHaveCount(0);
});
test("Controls remove unused bindings and migrate first/last defaults to Up and Down", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "novachess-appearance-v2",
      JSON.stringify({
        controls: {
          first: "Home",
          last: "End",
          puzzles: "p",
          learn: "l",
          legalHints: "i",
          coordinates: "k",
          sound: "m",
          catalog: "o",
          practice: "t",
        },
      }),
    ),
  );
  await page.goto("/#profile/controls");
  for (const name of [
    "Open puzzles",
    "Open Learn",
    "Toggle move hints",
    "Toggle coordinates",
    "Toggle move sounds",
    "Browse opening lessons",
    "Practice lesson moves",
  ])
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await expect(
    page
      .locator(".control-row")
      .filter({ hasText: "First move" })
      .getByRole("button"),
  ).toHaveText("ArrowUp");
  await expect(
    page
      .locator(".control-row")
      .filter({ hasText: "Last move" })
      .getByRole("button"),
  ).toHaveText("ArrowDown");
  await expect(
    page.locator(".control-row").filter({ hasText: "Cancel premoves" }),
  ).toContainText("Right click");
  await page.evaluate(() => (location.hash = "#analysis"));
  await move(page, "e2e4");
  await move(page, "e7e5");
  await page.locator("h1").click();
  await page.keyboard.press("ArrowUp");
  await expect(square(page, "e2")).toHaveAttribute("aria-label", /white pawn/);
  await page.keyboard.press("ArrowDown");
  await expect(square(page, "e5")).toHaveAttribute("aria-label", /black pawn/);
  await page.keyboard.press("p");
  await page.keyboard.press("l");
  await expect(
    page.getByRole("heading", { name: "Analysis", exact: true }),
  ).toBeVisible();
});
test("balanced boards hide material while a real surplus remains visible on the leading side", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await expect(square(page, "e2")).toBeVisible();
  await expect(page.locator(".material-imbalance,.material-top")).toHaveCount(
    0,
  );
  const fen = "7k/8/8/8/8/p7/PP6/7K w - - 0 1";
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + fen));
  await expect(
    page.getByLabel("Material advantage for White: +1", { exact: true }),
  ).toHaveText("+1");
  await page.keyboard.press("f");
  await expect(page.locator(".material-top")).toHaveText("+1");
  await expect(page.locator(".material-imbalance")).toHaveCount(0);
});
test("right click cancels premoves before highlighting and the next right click marks normally", async ({
  page,
}) => {
  await page.route("**/engine/stockfish-19-lite-single.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `self.onmessage=({data})=>{if(data==='uci')postMessage('uciok');else if(data==='isready')postMessage('readyok');else if(data.startsWith('go '))setTimeout(()=>postMessage('bestmove e7e5'),3500);};`,
    }),
  );
  await page.goto("/#play");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await move(page, "e2e4");
  await move(page, "g1f3");
  await expect(page.locator(".premove-queue")).toContainText("g1f3");
  await square(page, "e6").click({ button: "right" });
  await expect(page.locator(".premove-queue")).toHaveCount(0);
  await expect(square(page, "g1")).toHaveAttribute(
    "aria-label",
    /white knight/,
  );
  await expect(page.locator(".board-marks rect")).toHaveCount(0);
  await square(page, "e6").click({ button: "right" });
  await expect(page.locator(".board-marks rect")).toHaveCount(1);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("novachess-library-v2")!).activeGame
              .moves,
        ),
      { timeout: 15000 },
    )
    .toEqual(["e2e4", "e7e5"]);
});
