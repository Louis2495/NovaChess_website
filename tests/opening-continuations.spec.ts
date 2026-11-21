import { expect, test } from "@playwright/test";

test("the Sicilian family offers advanced continuations and clickable late checkpoints", async ({ page }) => {
  await page.goto("/#learn/lessons");
  await page.getByLabel("Opening family", { exact: true }).selectOption("Sicilian Defense");
  const family = page.getByRole("region", { name: "Sicilian Defense", exact: true });
  const main = family.getByRole("button", { name: /Advanced main continuation/ });
  await expect(main).toContainText("26 moves");
  expect(await family.getByRole("button", { name: /Advanced sideline/ }).count()).toBeGreaterThanOrEqual(2);
  await main.click();
  await expect(page.getByText("Worked example with a Stockfish continuation.")).toBeVisible();
  const checkpoints = page.locator(".study-checkpoints").getByRole("button");
  expect(await checkpoints.count()).toBeGreaterThanOrEqual(5);
  await checkpoints.last().click();
  await expect(page.locator(".lesson-next")).toContainText("26 / 26");
});
