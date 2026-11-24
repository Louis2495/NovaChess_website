import { expect, test } from "@playwright/test";

test("the Sicilian family offers advanced continuations and plays through the full main line", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/#learn/lessons");
  await page.getByRole("button", {name:"Browse openings", exact:true}).click();
  await page.getByLabel("Opening family", { exact: true }).selectOption("Sicilian Defense");
  const family = page.getByRole("region", { name: "Sicilian Defense", exact: true });
  const main = family.getByRole("button", { name: /Advanced main continuation/ });
  await expect(main).toContainText("26 moves");
  expect(await family.getByRole("button", { name: /Advanced sideline/ }).count()).toBeGreaterThanOrEqual(2);
  await main.click();
  await expect(page.locator(".lesson-next")).toContainText("0 / 26");
  const next = page.getByRole("group", { name: "Lesson playback" }).getByRole("button", { name: "Next", exact: true });
  for (let ply = 0; ply < 52; ply++) await next.click();
  await expect(page.locator(".lesson-next")).toContainText("26 / 26");
  await expect(page.locator(".lesson-next")).toContainText("Line complete");
  await expect(next).toBeDisabled();
});
