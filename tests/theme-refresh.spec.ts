import { test, expect } from "@playwright/test";
const previous = {
  theme: "Forest",
  background: "Default",
  backgroundColor: "#20313b",
  panelColor: "#304651",
  textColor: "#f4f8f5",
  mutedColor: "#b5c8c5",
  accent: "#96d9b8",
  buttonColor: "#96d9b8",
  board: "Rose",
  light: "#f5dfe4",
  dark: "#a85d77",
  premoves: false,
};
test("returning users receive the refreshed default palette while keeping board and game preferences", async ({
  page,
}) => {
  await page.addInitScript(
    (a) => localStorage.setItem("novachess-appearance-v2", JSON.stringify(a)),
    previous,
  );
  await page.goto("/");
  await expect(page.locator(".app")).toHaveCSS("--base", "#292d43");
  await expect(page.locator(".app")).toHaveCSS("--accent", "#c7c1ff");
  await expect(page.locator(".app")).toHaveCSS("--button", "#f1bb98");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("novachess-appearance-v2") || "{}")
            .theme,
      ),
    )
    .toBe("Periwinkle");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("novachess-appearance-v2") || "{}"),
  );
  expect(saved.board).toBe("Rose");
  expect(saved.premoves).toBe(false);
});
test("custom colors and uploaded backgrounds remain unchanged", async ({
  page,
}) => {
  const custom = {
    ...previous,
    theme: "Ocean",
    background: "Custom",
    backgroundColor: "#24243a",
    panelColor: "#41415b",
    accent: "#72b2ff",
    buttonColor: "#ffe0a0",
  };
  await page.addInitScript(
    (a) => localStorage.setItem("novachess-appearance-v2", JSON.stringify(a)),
    custom,
  );
  await page.goto("/");
  await expect(page.locator(".app")).toHaveCSS(
    "--base",
    custom.backgroundColor,
  );
  await expect(page.locator(".app")).toHaveCSS("--accent", custom.accent);
  await expect(page.locator(".app")).toHaveCSS("--button", custom.buttonColor);
});
