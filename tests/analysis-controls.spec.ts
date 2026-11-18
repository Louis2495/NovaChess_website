import { test, expect } from "@playwright/test";
const square = (page: any, s: string) =>
  page
    .getByRole("group", { name: "Chessboard", exact: true })
    .first()
    .getByRole("button", { name: new RegExp("^" + s + ",") });
test("analysis starts with closed notation and three adjustable engine lines, names only when saving, and aligns navigation beneath the board", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await expect(
    page.getByRole("button", { name: "Notation", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Game notation", { exact: true })).toBeHidden();
  await expect(page.getByLabel("Study name", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Number of engine lines" }).getByRole("button", {name:"3", exact:true})).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".engine-line")).toHaveCount(3);
  await page.getByRole("group", { name: "Number of engine lines" }).getByRole("button", {name:"2", exact:true}).click();
  await expect(page.locator(".engine-line")).toHaveCount(2);
  const board = (await page.locator(".analysis-layout .board").boundingBox())!,
    bar = (await page.locator(".analysis-navigation").boundingBox())!;
  expect(Math.abs(board.width - bar.width)).toBeLessThan(1);
  expect(Math.abs(board.x - bar.x)).toBeLessThan(1);
  expect(bar.y).toBeGreaterThan(board.y + board.height + 10);
  const cards = await page.locator('.analysis-layout > .side-panels > .card').evaluateAll(elements => elements.map(element => element.className));
  expect(cards[0]).toContain('engine-top-lines');
  expect(cards[1]).toContain('positional-insights');
  expect(cards[2]).toContain('analysis-notation');
  await square(page, "e2").click();
  await square(page, "e4").click();
  await page.getByRole("button", { name: "Notation", exact: true }).click();
  await expect(page.getByLabel("Game notation", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Game notation", { exact: true })).toContainText(
    "e4",
  );
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await page.getByLabel("Study name", { exact: true }).fill("My study");
  await page
    .getByRole("dialog", { name: "Save study" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Save study" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("novachess-library-v2") || "{}")
          .games[0].title,
    ),
  ).toBe("My study");
});
test("right click cancels a held piece without moving or marking, and a different piece can be grabbed immediately", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const a = (await square(page, "e2").boundingBox())!,
    b = (await square(page, "e4").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect(page.locator(".drag-piece")).toBeVisible();
  await page.mouse.move((await page.viewportSize())!.width - 3, 3);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await expect(page.locator(".drag-piece")).toHaveCount(0);
  await page.mouse.up();
  await expect(square(page, "e2")).toHaveAttribute(
    "aria-label",
    "e2, white pawn",
  );
  await expect(
    page.locator(".board-square[data-annotation],.board-marks line,.board-marks polyline"),
  ).toHaveCount(0);
  const c = (await square(page, "d2").boundingBox())!,
    d = (await square(page, "d4").boundingBox())!;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2);
  await page.mouse.up();
  await expect(square(page, "d4")).toHaveAttribute(
    "aria-label",
    "d4, white pawn",
  );
});
test("knight annotations turn at a right angle and Library has no repertoire section", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const a = (await square(page, "g1").boundingBox())!,
    b = (await square(page, "f3").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.up({ button: "right" });
  const arrow = page.locator(".board-marks polyline");
  await expect(arrow).toHaveCount(1);
  const points = (await arrow.getAttribute("points"))!
    .split(" ")
    .map((p) => p.split(",").map(Number));
  expect(points).toHaveLength(3);
  expect(
    points[0][0] === points[1][0] || points[0][1] === points[1][1],
  ).toBeTruthy();
  expect(
    points[1][0] === points[2][0] || points[1][1] === points[2][1],
  ).toBeTruthy();
  await page.goto("/#library");
  await page
    .getByRole("group", { name: "Library sections" })
    .getByRole("button", { name: "Studies", exact: true })
    .click();
  await expect(
    page.getByText(/0 lines · 0 due|No saved lines|Opening repertoire/),
  ).toHaveCount(0);
});
