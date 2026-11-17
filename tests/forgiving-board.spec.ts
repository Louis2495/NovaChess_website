import { test, expect } from "@playwright/test";
const square = (page: any, name: string) => page.getByRole("group", { name: "Chessboard", exact: true }).first().getByRole("button", { name: new RegExp("^" + name + ",") });
test("drops require a legal square containing at least half of the held piece", async ({ page }) => {
  await page.goto("/#analysis");
  async function drop(from: string, to: string, offset: number) {
    const a = (await square(page, from).boundingBox())!, b = (await square(page, to).boundingBox())!;
    await page.mouse.move(a.x+a.width/2, a.y+a.height/2); await page.mouse.down();
    await page.mouse.move(b.x + b.width*offset, b.y+b.height/2, {steps:8}); await page.mouse.up();
  }
  await drop("e2", "e4", 1.3);
  await expect(square(page, "e2")).toHaveAttribute("aria-label", "e2, white pawn");
  await drop("e2", "e4", .95);
  await expect(square(page, "e4")).toHaveAttribute("aria-label", "e4, white pawn");
  await page.getByRole("button", {name:"Reset",exact:true}).click();
  await drop("a2", "a4", -.3);
  await expect(square(page, "a2")).toHaveAttribute("aria-label", "a2, white pawn");

});
test("account legal-move preference persists and removes move dots everywhere", async ({ page }) => {
  await page.goto("/#profile");
  const setting = page.getByRole("checkbox", {name:"Show legal moves",exact:true});
  await expect(setting).not.toBeChecked(); await setting.check(); await setting.uncheck();
  await page.goto("/#analysis"); await square(page,"e2").click();
  await expect(page.locator(".legal-dot,.legal-capture")).toHaveCount(0);
  await page.goto("/#profile"); await expect(setting).not.toBeChecked(); await setting.check();
  await page.goto("/#analysis"); await square(page,"e2").click();
  await expect(page.locator(".legal-dot")).toHaveCount(2);
});
test("solid square colors preserve pieces and player bars track a resized game board", async ({page}) => {
  await page.goto("/#analysis");
  await square(page,"e2").click({button:"right"});
  await expect(square(page,"e2")).toHaveCSS("background-color","rgb(31, 186, 98)");
  await expect(square(page,"e2").locator(".piece")).toBeVisible();
  await page.goto("/#play");await page.getByRole("button",{name:"Computer",exact:true}).click();await page.getByRole("button",{name:"Start game",exact:true}).click();
  const resize=page.getByRole("slider",{name:"Resize board",exact:true}).first();await resize.focus();await resize.press("ArrowLeft");await resize.press("ArrowLeft");
  await expect.poll(async()=>{
    const b=(await page.locator(".play-match .board").first().boundingBox())!;
    const bars=await page.locator(".play-match .board-column > .player-strip").all();
    return Math.max(...await Promise.all(bars.map(async el=>{const r=(await el.boundingBox())!;return Math.max(Math.abs(r.x-b.x),Math.abs(r.width-b.width));})));
  }).toBeLessThan(1);
});
