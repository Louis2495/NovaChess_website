import { test, expect } from "@playwright/test";
import { Chess } from "chess.js";
function line(moves: string[]) {
  const c = new Chess(),
    positions = [c.fen()],
    notation: string[] = [];
  for (const move of moves) {
    notation.push(c.move(move).san);
    positions.push(c.fen());
  }
  return { initial: positions[0], moves, positions, notation };
}
test("Library separates recorded games, branching training studies and NovaChess history", async ({
  page,
}) => {
  const main = line(["e2e4", "e7e5", "g1f3", "b8c6"]),
    branch = line(["d2d4", "d7d5", "c2c4"]);
  const common = {
    created: Date.now(),
    variant: "chess",
    human: "w",
    result: "*",
    folder: "Games",
    ...main,
  };
  await page.addInitScript(
    (games) =>
      localStorage.setItem("novachess-library-v2", JSON.stringify({ games })),
    [
      {
        ...common,
        id: "study",
        title: "Training study",
        kind: "study",
        folder: "Studies",
        branches: [{ ...branch, name: "Queen pawn" }],
      },
      {
        ...common,
        id: "recorded",
        title: "Master game",
        kind: "game",
        origin: "archive",
        result: "1-0",
      },
      {
        ...common,
        id: "played",
        title: "NovaChess game",
        kind: "game",
        origin: "novachess",
        result: "0-1",
        opponent: "Computer",
      },
    ],
  );
  await page.goto("/#library");
  await expect(
    page.getByRole("heading", { name: "Library", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/games and studies/)).toHaveCount(0);
  const sections = page.getByRole("group", { name: "Library sections" });
  await sections.getByRole("button", { name: "Games", exact: true }).click();
  await expect(page.locator(".saved-game-card")).toHaveCount(1);
  await expect(page.locator(".saved-game-card")).toContainText("Master game");
  await expect(page.getByRole("button", { name: "Train lines" })).toHaveCount(
    0,
  );
  await sections
    .getByRole("button", { name: "NovaChess", exact: true })
    .click();
  await expect(page.locator(".saved-game-card")).toHaveCount(1);
  await expect(page.locator(".saved-game-card")).toContainText(
    "NovaChess game",
  );
  await sections.getByRole("button", { name: "Studies", exact: true }).click();
  await expect(page.locator(".saved-game-card")).toContainText("2 lines");
  await page.getByRole("button", { name: "Train lines", exact: true }).click();
  await page
    .getByRole("group", { name: "Study line", exact: true })
    .getByRole("button", { name: "Queen pawn", exact: true })
    .click();
  const board = page.getByRole("group", { name: "Chessboard", exact: true });
  await board.getByRole("button", { name: /^d2,/ }).click();
  await board.getByRole("button", { name: /^d4,/ }).click();
  await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
  await expect(
    board.getByRole("button", { name: "d5, black pawn", exact: true }),
  ).toBeVisible();
});
test("profile photo is inside the cover with a small accessible upload icon and a softer button color", async ({
  page,
}) => {
  await page.goto("/#profile");
  await expect(page.getByText("Upload photo", { exact: true })).toHaveCount(0);
  const avatar = (await page.locator(".profile-avatar").boundingBox())!,
    cover = (await page.locator(".profile-cover").boundingBox())!;
  expect(avatar.y).toBeGreaterThanOrEqual(cover.y);
  expect(avatar.y + avatar.height).toBeLessThanOrEqual(cover.y + cover.height);
  await expect(
    page.getByLabel("Upload profile picture", { exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".app")).toHaveCSS("--button", "#add9ed");
  await expect(
    page.locator(".sidebar nav").getByRole("button", { name: "Variants", exact: true, includeHidden: true }),
  ).toHaveCount(1);
  const tabs = await page
    .locator(".sidebar nav")
    .first()
    .locator("button")
    .allTextContents();
  expect(tabs.slice(-3)).toEqual(["Stats", "Players", "Chat"]);
});
test("analysis keeps the same engine searching beyond the old time budget and cancels it when leaving", async ({
  page,
}) => {
  await page.route("**/engine/stockfish-19-lite-single.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `let timer;onmessage=({data})=>{if(data==='uci')postMessage('uciok');if(data==='isready')postMessage('readyok');if(data.startsWith('go ')){postMessage('info depth 1 score cp 20 pv e2e4');let d=1;timer=setInterval(()=>postMessage('info depth '+(++d)+' score cp 20 pv e2e4'),300);if(data.includes('movetime'))setTimeout(()=>{clearInterval(timer);postMessage('bestmove e2e4')},1200)}};`,
    }),
  );
  await page.addInitScript(() => {
    const Native = window.Worker;
    (window as any).engineStops = 0;
    window.Worker = class extends Native {
      terminate() {
        (window as any).engineStops++;
        super.terminate();
      }
    };
  });
  await page.goto("/#analysis");
  await expect(page.getByText(/Stockfish 19 Lite · Depth [1-9]/)).toBeVisible();
  await expect
    .poll(
      async () =>
        Number(
          (await page.locator(".analysis-engine-label").innerText()).match(
            /Depth (\d+)/,
          )?.[1],
        ),
      { timeout: 7000 },
    )
    .toBeGreaterThan(7);
  await page.goto("/#profile");
  await expect(
    page.getByRole("heading", { name: "Profile", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).engineStops),
  ).toBeGreaterThan(0);
});
