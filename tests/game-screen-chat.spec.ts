import { test, expect } from "@playwright/test";
test("games maximize the board, omit typing/pause/game settings, use profile images and put actions above narrow notation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/#play");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await expect(page.locator(".play-match .board").first()).toBeVisible();
  await expect(page.getByLabel("Game move", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Pause|^New game$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Game", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/White to move|Black to move|local estimate/i),
  ).toHaveCount(0);
  const board = (await page
    .locator(".play-match .board")
    .first()
    .boundingBox())!;
  if (!isMobile) {
    expect(board.width).toBeGreaterThan(750);
    expect(
      (await page.locator(".match-sidebar").boundingBox())!.width,
    ).toBeLessThanOrEqual(220);
  }
  await expect(
    page.locator(".play-match .player-strip .avatar img"),
  ).toHaveCount(1);
  const actions = (await page
      .locator(".match-sidebar .game-actions")
      .boundingBox())!,
    notation = (await page.locator(".match-notation").boundingBox())!;
  expect(actions.y + actions.height).toBeLessThan(notation.y);
  await page.getByRole("button", { name: "Resign", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New game", exact: true }),
  ).toBeVisible();
});
test("illegal drops return silently and global chat supports a draft without pretending to be connected", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const square = (s: string) =>
    page
      .getByRole("group", { name: "Chessboard", exact: true })
      .getByRole("button", { name: new RegExp("^" + s + ",") });
  const a = (await square("e2").boundingBox())!,
    b = (await square("e5").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.up();
  await expect(square("e2")).toHaveAttribute("aria-label", "e2, white pawn");
  await expect(page.getByText(/illegal move|not legal/i)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open global chat", exact: true })
    .click();
  await page.getByLabel("Message global chat", { exact: true }).fill("A draft");
  await expect(
    page.getByLabel("Message global chat", { exact: true }),
  ).toHaveValue("A draft");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Draft only · chat is not connected yet.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close global chat", exact: true })
    .click();
});
