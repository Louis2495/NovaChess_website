import { test, expect } from "@playwright/test";
test("two/three option selectors render as working toggle bars, including federation and appearance controls", async ({
  page,
}) => {
  await page.goto("/#stats/rankings");
  const federation = page.getByRole("group", {
    name: "Federation",
    exact: true,
  });
  await expect(federation.getByRole("button")).toHaveCount(2);
  await federation.getByRole("button", { name: "USCF", exact: true }).click();
  await page.getByLabel("Member ID", { exact: true }).fill("12641216");
  await expect(
    page.getByRole("link", { name: "Official record", exact: true }),
  ).toHaveAttribute("href", /uschess\.org/);
  await page.goto("/#profile");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Appearance", exact: true });
  await dialog.getByRole("tab", { name: "Layout", exact: true }).click();
  const spacing = dialog.getByRole("group", { name: "Spacing", exact: true });
  await expect(spacing.getByRole("button")).toHaveCount(3);
  await spacing.getByRole("button", { name: "Compact", exact: true }).click();
  await expect(page.locator(".app")).toHaveCSS("--space", "14px");
  await spacing.getByRole("button", { name: "Compact", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    spacing.getByRole("button", { name: "Comfortable", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("tab", { name: "Moves", exact: true }).click();
  await expect(
    dialog
      .getByRole("group", { name: "Analysis candidates", exact: true })
      .getByRole("button"),
  ).toHaveCount(2);
  const leftovers = await page
    .locator("select:visible")
    .evaluateAll((es) =>
      es
        .filter((e) => [2, 3].includes((e as HTMLSelectElement).options.length))
        .map((e) => e.getAttribute("aria-label")),
    );
  expect(leftovers).toEqual([]);
});
test("returning default lavender palette becomes neutral slate without changing board preferences", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "novachess-appearance-v2",
      JSON.stringify({
        theme: "Periwinkle",
        background: "Default",
        backgroundColor: "#292d43",
        panelColor: "#3b425d",
        accent: "#c7c1ff",
        buttonColor: "#b7c7ed",
        textColor: "#fbf8ff",
        mutedColor: "#c6c7dc",
        board: "Walnut",
        light: "#ead7b7",
        dark: "#6e4730",
      }),
    ),
  );
  await page.goto("/");
  await expect(page.locator(".app")).toHaveCSS("--base", "#252e3a");
  await expect(page.locator(".app")).toHaveCSS("--accent", "#b2d3e7");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("novachess-appearance-v2") || "{}")
            .theme,
      ),
    )
    .toBe("Steel");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("novachess-appearance-v2") || "{}")
          .board,
    ),
  ).toBe("Walnut");
});
