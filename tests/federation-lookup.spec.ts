import { test, expect } from "@playwright/test";
test("USCF loads through the configured public function without a browser federation request or account", async ({
  page,
}) => {
  const endpoint =
    "https://example-project.supabase.co/functions/v1/federation-records";
  await page.route("**/federation-lookup.json", (r) =>
    r.fulfill({ json: { url: endpoint } }),
  );
  const blocked: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("uschess.org")) blocked.push(r.url());
  });
  await page.route(endpoint, (r) => {
    expect(r.request().postDataJSON()).toEqual({
      kind: "uscf",
      id: "12641216",
    });
    return r.fulfill({
      json: {
        id: "12641216",
        name: "Test Member",
        source: "uscf",
        standard: 2400,
        rapid: 2300,
        blitz: 2350,
        updatedAt: Date.now(),
      },
    });
  });
  await page.goto("/#profile");
  await page.getByLabel("USCF profile", { exact: true }).fill("12641216");
  await page
    .getByRole("button", { name: "Load USCF profile", exact: true })
    .click();
  await expect(page.getByLabel("USCF player name")).toHaveValue("Test Member");
  await expect(page.getByLabel("USCF regular rating")).toHaveValue("2400");
  await expect(page.getByLabel("USCF quick rating")).toHaveValue("2300");
  await expect(page.getByLabel("USCF blitz rating")).toHaveValue("2350");
  expect(blocked).toEqual([]);
  await page.goto("/#stats/rankings");
  await expect(page.locator(".federation-cards")).toContainText("Test Member");
});
test("an unconnected lookup explains the missing setup instead of a misleading USCF outage", async ({
  page,
}) => {
  await page.route("**/federation-lookup.json", (r) =>
    r.fulfill({ json: { url: "" } }),
  );
  await page.goto("/#profile");
  await page.getByLabel("USCF profile", { exact: true }).fill("12641216");
  await page
    .getByRole("button", { name: "Load USCF profile", exact: true })
    .click();
  await expect(
    page.getByText(
      "USCF lookup is not connected yet. The site owner needs to deploy the federation lookup function.",
      { exact: true },
    ),
  ).toBeVisible();
});
