import { test, expect } from "@playwright/test";

test("home loads without runtime errors, missing assets, or horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your next move.",
  );
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("img").first()).toBeVisible();
  expect(
    await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBeTruthy();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
test("prelaunch dialog is honest, dismisses with Escape, and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page
    .getByRole("button", { name: "Follow the launch" })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("still in development");
  await dialog.getByText("Want to try the source build?").click();
  await expect(
    dialog.getByText("You’ll need a Mac", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Follow the project" }),
  ).toHaveAttribute("href", "https://github.com/Louis2495/ChessVision");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("puzzles reject errors, provide hints, solve legally, persist and reset progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Puzzles", exact: true }).click();
  let panel = page.getByRole("tabpanel");
  await panel.getByRole("button", { name: /^d1, white queen/ }).click();
  await panel.getByRole("button", { name: /^d2,/ }).click();
  await expect(panel.getByRole("status")).toContainText("Not quite");
  await panel.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("Hint");
  await panel.getByRole("button", { name: /^d8,/ }).click();
  await expect(panel.getByRole("status")).toContainText("checkmate");
  await expect(panel).toContainText("1 / 3 solved");
  await panel.getByRole("button", { name: "Next puzzle" }).click();
  await panel.getByRole("button", { name: /^c3, white queen/ }).click();
  await panel.getByRole("button", { name: /^h8,/ }).click();
  await expect(panel.getByRole("status")).toContainText("checkmate");
  await panel.getByRole("button", { name: "Next puzzle" }).click();
  await panel.getByRole("button", { name: /^b7, white rook/ }).click();
  await panel.getByRole("button", { name: /^f7,/ }).click();
  await expect(panel.getByRole("status")).toContainText("checkmate");
  await expect(panel).toContainText("3 / 3 solved");
  await page.reload();
  await page.getByRole("tab", { name: "Puzzles", exact: true }).click();
  panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("3 / 3 solved");
  await panel.getByRole("button", { name: "Reset progress" }).click();
  await expect(panel).toContainText("0 / 3 solved");
});
test("puzzle supports typed moves and reports illegal input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Puzzles", exact: true }).click();
  const panel = page.getByRole("tabpanel");
  await panel.getByText("Prefer to type your move?").click();
  await panel.getByRole("textbox").fill("a1a8");
  await panel.getByRole("button", { name: "Play", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("Use a legal move");
  await panel.getByRole("textbox").fill("Qd8");
  await panel.getByRole("button", { name: "Play", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("checkmate");
});
test("analysis sandbox moves, undoes and resets", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("button", { name: "Take back" })).toBeDisabled();
  await panel.getByRole("button", { name: /^f1, white rook/ }).click();
  await panel.getByRole("button", { name: /^e1,/ }).click();
  await expect(panel.getByRole("status")).toContainText("Black to move");
  await expect(panel.getByLabel("Your played moves")).toContainText("Re1");
  await panel.getByRole("button", { name: "Take back" }).click();
  await expect(
    panel.getByRole("button", { name: /^f1, white rook/ }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Reset board" }).click();
  await expect(panel.getByRole("status")).toContainText("White to move");
});
test("every opening walkthrough plays and restarts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  const panel = page.getByRole("tabpanel");
  for (const [i, length] of [
    [0, 12],
    [1, 10],
    [2, 10],
  ]) {
    await panel.getByRole("combobox").selectOption(String(i));
    await expect(
      panel.getByRole("button", { name: "Back", exact: true }),
    ).toBeDisabled();
    for (let n = 0; n < length; n++)
      await panel
        .getByRole("button", { name: "Next move", exact: true })
        .click();
    await expect(
      panel.getByRole("button", { name: "Play again", exact: true }),
    ).toBeVisible();
    await expect(panel.getByRole("status")).toContainText(
      `${length} / ${length}`,
    );
    await panel.getByRole("button", { name: "Play again" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "The starting position",
    );
  }
});
test("theme picker and variant previews update visually", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ocean palette" }).click();
  await expect(
    page.getByRole("button", { name: "Ocean palette" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".style-caption")).toHaveText(
    "Ocean board palette",
  );
  expect(
    await page.locator(".style-board .chessboard").getAttribute("style"),
  ).toContain("#376e99");
  await page.getByRole("button", { name: /Duck chess/ }).click();
  await expect(
    page.getByAltText("NovaChess mallard duck chess piece"),
  ).toBeVisible();
  await expect(page.locator(".variant-caption h3")).toHaveText("Duck chess");
  await page.getByRole("button", { name: /Blindfold/ }).click();
  await expect(page.getByText("See it in your mind.")).toBeVisible();
});
test("FAQ, privacy, credits and mobile navigation work", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "FAQ", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open menu" }),
    ).toHaveAttribute("aria-expanded", "false");
  }
  await page
    .getByText("When can I download NovaChess?", { exact: true })
    .click();
  await expect(
    page.getByText(
      "NovaChess is in development and isn’t on the App Store yet.",
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "automatically publishes game boards",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Credits & licenses" }).click();
  await expect(page.getByRole("dialog")).toContainText("Colin M. L. Burnett");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-full.png`,
    fullPage: true,
  });
});

test("tabs support arrow-key navigation and accessible structure in each interactive state", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await page.getByRole("tab", { name: "Analysis", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Puzzles", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Puzzles", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  for (const mode of ["Analysis", "Puzzles", "Learn"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Follow the launch" }).first().click();
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
