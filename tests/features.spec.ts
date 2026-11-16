import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { Chess } from "chess.js";
const square = (page: Page, sq: string) =>
  page
    .getByRole("group", { name: "Chessboard", exact: true })
    .first()
    .getByRole("button", { name: new RegExp("^" + sq + ",") });
async function move(p: Page, m: string) {
  await square(p, m.slice(0, 2)).click();
  await square(p, m.slice(2, 4)).click();
}
// Record unsupported calls before native WASM can terminate the renderer.
async function protectNativeEngine(page: Page) {
  const rejected = await page.evaluate(async () => {
    const load = new Function('return import("/src/lib/variants.ts")');
    const { fairy, makeBoard } = await load();
    const ff = await fairy();
    const key = "novachess-test-native-variant-calls";
    if (!localStorage.getItem(key)) localStorage.setItem(key, "[]");
    ff.Board = new Proxy(ff.Board, {
      construct(target, args, newTarget) {
        if (["dropping", "chaos", "random"].includes(args[0])) {
          localStorage.setItem(
            key,
            JSON.stringify([
              ...JSON.parse(localStorage.getItem(key)!),
              args[0],
            ]),
          );
          throw new Error("Unsupported variant reached the native engine.");
        }
        return Reflect.construct(target, args, newTarget);
      },
    });
    return ["dropping", "chaos", "random"].map((variant) => {
      try {
        makeBoard(ff, variant);
        return "not rejected";
      } catch (error) {
        return (error as Error).message;
      }
    });
  });
  expect(rejected).toEqual(
    ["dropping", "chaos", "random"].map(
      (variant) => `The local engine does not support variant: ${variant}`,
    ),
  );
}
test("the entire daily puzzle card opens the daily puzzle and has no small action", async ({
  page,
}) => {
  for (const selector of [
    ".home-puzzle h2",
    ".home-puzzle .board",
    ".home-puzzle",
  ]) {
    await page.goto("/");
    await expect(page.locator(selector)).toBeVisible();
    await page.locator(selector).click({ force: true });
    await expect(
      page.getByRole("heading", { name: "Daily puzzle", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Solve puzzle", exact: true }),
  ).toHaveCount(0);
});
test("all public routes remove import controls, flip buttons and global customization", async ({
  page,
}) => {
  for (const route of [
    "",
    "analysis",
    "play",
    "learn",
    "research",
    "library",
    "stats",
  ]) {
    await page.goto("/#" + route);
    await page.locator("h1:visible").waitFor();
    await expect(
      page.getByRole("button", { name: /Import|Flip board|Customize/ }),
    ).toHaveCount(0);
  }
  await page.goto("/#profile");
  await expect(
    page.getByRole("button", { name: "Customize", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Sharing|Local storage|Your data/ }),
  ).toHaveCount(0);
  await page.goto("/#learn");
  await expect(page.getByText("Local progress", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Endgame Lessons/ }),
  ).toBeVisible();
});
test("material totals follow bottom color and the remapped flip key", async ({
  page,
}) => {
  const fen = "7k/8/8/8/8/p7/PP6/7K w - - 0 1";
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + fen));
  await expect(
    page.getByLabel("Material advantage for White: +1", { exact: true }),
  ).toHaveText("+1");
  await page.keyboard.press("f");
  await expect(
    page.getByLabel("Material advantage for White: +1", { exact: true }),
  ).toHaveText("+1");
  await page.goto("/#controls");
  const binding = page
    .locator(".control-row")
    .filter({ hasText: "Flip board" })
    .getByRole("button");
  await binding.click();
  await binding.press("v");
  await page.goto("/#analysis/" + encodeURIComponent("fen:" + fen));
  await page.keyboard.press("f");
  await expect(
    page.getByLabel("Material advantage for White: +1", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("v");
  await expect(
    page.getByLabel("Material advantage for White: +1", { exact: true }),
  ).toBeVisible();
});
test("piece drag snaps by its center at a square boundary and does not show a yellow selection box", async ({
  page,
}) => {
  await page.goto("/#analysis");
  const from = (await square(page, "e2").boundingBox())!,
    to = (await square(page, "e4").boundingBox())!;
  await page.mouse.move(from.x + from.width * 0.85, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width * 0.9, to.y + to.height / 2, {
    steps: 8,
  });
  await expect(page.locator(".drag-piece")).toBeVisible();
  await page.mouse.up();
  await expect(page.locator(".notation-table")).toContainText("e4");
  await square(page, "g8").click();
  const selected = square(page, "g8");
  expect(
    await selected.evaluate((e) => getComputedStyle(e, "::after").display),
  ).toBe("none");
});
test("right click creates colored square marks and arrows, and controls change their colors", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await square(page, "e4").click({ button: "right" });
  await expect(page.locator(".board-marks rect")).toHaveAttribute(
    "fill",
    "#187b46",
  );
  await square(page, "d4").click({ button: "right", modifiers: ["Shift"] });
  await expect(page.locator(".board-marks rect").nth(1)).toHaveAttribute(
    "fill",
    "#205eab",
  );
  const a = (await square(page, "a1").boundingBox())!,
    b = (await square(page, "a4").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
  await page.mouse.up({ button: "right" });
  await expect(page.locator(".board-marks line")).toHaveCount(1);
  await page.goto("/#controls");
  await page.getByLabel("Square / arrow annotation color").fill("#12abcd");
  await page.goto("/#analysis");
  await square(page, "e4").click({ button: "right" });
  await expect(page.locator(".board-marks rect")).toHaveAttribute(
    "fill",
    "#12abcd",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".board-marks rect")).toHaveCount(0);
});
test("promotion is adjacent and puts the queen under the release point", async ({
  page,
}) => {
  await page.goto(
    "/#analysis/" + encodeURIComponent("fen:7k/P7/8/8/8/8/8/7K w - - 0 1"),
  );
  await square(page, "a7").click();
  const target = (await square(page, "a8").boundingBox())!;
  await page.mouse.click(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  const queen = page.getByRole("button", {
      name: "Promote to queen",
      exact: true,
    }),
    rook = page.getByRole("button", { name: "Promote to rook", exact: true });
  await expect(queen).toBeVisible();
  const q = (await queen.boundingBox())!,
    r = (await rook.boundingBox())!;
  expect(
    Math.abs(q.x + q.width / 2 - target.x - target.width / 2),
  ).toBeLessThan(2);
  expect(
    Math.abs(q.y + q.height / 2 - target.y - target.height / 2),
  ).toBeLessThan(2);
  expect(Math.abs(q.x + q.width - r.x)).toBeLessThan(1);
  await queen.click();
  await expect(page.locator(".notation-table")).toContainText("a8=Q");
});
test("opening desk collapses the catalog, exposes deep plans and branches and fits a full-height screen", async ({
  page,
}) => {
  await page.goto("/#learn/lessons");
  await page.locator(".opening-row").first().click();
  await expect(page.locator(".opening-list")).toHaveCount(0);
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "White’s plan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Lesson variation").locator("option"),
  ).toHaveCount(4);
  await page.getByLabel("Lesson variation").selectOption("1");
  await expect(page.getByLabel("Lesson variation")).toHaveValue("1");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pawn breaks", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator(".lesson-quiz>button")).toHaveCount(3);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".lesson-next")).toContainText("1 /");
  if ((await page.evaluate(() => innerHeight)) >= 700)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBeTruthy();
});
test("history era navigation and champion ratings are intuitive and factual", async ({
  page,
}) => {
  await page.goto("/#learn/history");
  await page.getByRole("button", { name: "Digital era", exact: true }).click();
  for (const year of await page
    .locator(".history-event-list time")
    .allTextContents())
    expect(+year).toBeGreaterThanOrEqual(2000);
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(page.locator(".history-paging")).toContainText("2 /");
  await page
    .getByRole("button", { name: "World champions", exact: true })
    .click();
  await page.getByLabel("Show event ratings", { exact: true }).check();
  await expect(
    page
      .locator(".champion-timeline .pill")
      .filter({ hasText: /\d{4} · \d{4}/ })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Championship lineage", exact: true })
    .getByRole("button", { name: /FIDE split/ })
    .click();
  expect(
    await page.locator(".champion-timeline>.card").count(),
  ).toBeGreaterThan(0);
});
test("famous games replay, autoplay speeds and complete GIF export work", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto("/#learn/famous");
  await page.getByRole("button", { name: /1858.*Opera Game/ }).click();
  await expect(
    page.getByRole("heading", { name: "The Opera Game", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Replay speed").selectOption("250");
  await page.getByRole("button", { name: "Play replay", exact: true }).click();
  await expect
    .poll(() =>
      page.getByRole("slider", { name: "Replay position" }).inputValue(),
    )
    .not.toBe("0");
  await page.getByRole("button", { name: "Stop replay", exact: true }).click();
  await page.getByRole("button", { name: "Last move", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Replay position" }),
  ).toHaveValue("33");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Game GIF", exact: true }).click();
  const d = await dl,
    buffer = fs.readFileSync((await d.path())!);
  expect(buffer.subarray(0, 3).toString()).toBe("GIF");
  expect(countFrames(buffer)).toBe(34);
  await page.getByRole("button", { name: "Save game", exact: true }).click();
  await page.goto("/#library");
  await expect(page.locator(".saved-game-card")).toHaveCount(1);
});
function countFrames(b: Buffer) {
  let i = 13,
    frames = 0;
  const packed = b[10];
  if (packed & 128) i += 3 * 2 ** ((packed & 7) + 1);
  function blocks() {
    while (b[i]) i += b[i] + 1;
    i++;
  }
  while (i < b.length) {
    const tag = b[i++];
    if (tag === 0x3b) break;
    if (tag === 0x21) {
      i++;
      blocks();
    } else if (tag === 0x2c) {
      frames++;
      const p = b[i + 8];
      i += 9;
      if (p & 128) i += 3 * 2 ** ((p & 7) + 1);
      i++;
      blocks();
    } else throw Error("Invalid GIF block " + tag);
  }
  return frames;
}
for (const variant of ["dropping", "chaos", "random"])
  test(`new ${variant} variant plays legal moves against the computer`, async ({
    page,
  }) => {
    await page.goto("/#play");
    await protectNativeEngine(page);
    await page
      .getByRole("button", { name: "Game options", exact: true })
      .click();
    await page.getByLabel("Variant", { exact: true }).selectOption(variant);
    if (variant === "dropping") {
      await expect(page.getByLabel("Squares to drop")).toHaveValue("2");
      await page.getByLabel("Squares to drop").selectOption("4");
    }
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    const key = "novachess-special-" + variant;
    await expect
      .poll(async () => page.evaluate((k) => localStorage.getItem(k), key))
      .not.toBeNull();
    const state = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).state,
      key,
    );
    if (variant === "random") {
      const c = new Chess(state.fen),
        m = c
          .moves({ verbose: true })
          .find((m) => m.from === state.randomFrom)!;
      await move(page, m.from + m.to);
    } else await move(page, "e2e4");
    await expect
      .poll(async () =>
        page.evaluate(
          (k) => JSON.parse(localStorage.getItem(k)!).state.moves.length,
          key,
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await page.goto("/");
    await protectNativeEngine(page);
    await page
      .getByRole("button", { name: "Resume saved game", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Resign", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k)!).state.moves.length,
        key,
      ),
    ).toBeGreaterThanOrEqual(2);
    if (variant === "chaos") {
      await page.getByRole("button", { name: "Freeze", exact: true }).click();
      await square(page, "a7").click();
      await expect(
        page.getByRole("button", { name: "Freeze", exact: true }),
      ).toBeDisabled();
      const ply = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k)!).state.ply,
        key,
      );
      expect(ply).toBe(2);
    }
    await page.getByRole("button", { name: "Resign", exact: true }).click();
    await expect(page.getByText("Black wins", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(
            localStorage.getItem("novachess-test-native-variant-calls")!,
          ),
        ),
      )
      .toEqual([]);
    if (variant === "dropping") {
      await page.getByRole("button", { name: "New game", exact: true }).click();
      await page
        .getByRole("button", { name: "Game options", exact: true })
        .click();
      await page
        .getByLabel("Variant", { exact: true })
        .selectOption("dropping");
      await page.getByLabel("Squares to drop").selectOption("1");
      await page
        .getByRole("button", { name: "Start game", exact: true })
        .click();
      await expect
        .poll(async () =>
          page.evaluate(
            (k) => JSON.parse(localStorage.getItem(k)!).state.dropCount,
            key,
          ),
        )
        .toBe(1);
      await expect
        .poll(async () =>
          page.evaluate(
            (k) => JSON.parse(localStorage.getItem(k)!).state.ply,
            key,
          ),
        )
        .toBe(0);
    }
  });
test("Guess the Eval scores a real engine estimate and advances rounds", async ({
  page,
}) => {
  await page.goto("/#puzzles/eval");
  await page.getByLabel("Your evaluation").fill("0");
  const lock = page.getByRole("button", { name: "Lock in", exact: true });
  await expect(lock).toBeEnabled({ timeout: 20000 });
  await lock.click();
  await expect(page.locator(".eval-result")).toContainText("Stockfish");
  await expect(page.locator(".eval-result strong")).toContainText(
    /[+-]?\d+\.\d{2}/,
  );
  await page
    .getByRole("button", { name: "Next position", exact: true })
    .click();
  await expect(page.locator(".game-score-row")).toContainText("Round 2 / 5");
});
test("encyclopedia covers advanced motifs and opening lines, and quizzes use legal chess choices", async ({
  page,
}) => {
  await page.goto("/#learn/encyclopedia");
  await page.getByLabel("Search encyclopedia").fill("Novotny");
  await page.locator(".encyclopedia-index>button").first().click();
  await expect(page.locator(".encyclopedia-entry")).toContainText(
    "interference",
  );
  await page.getByLabel("Search encyclopedia").fill("Najdorf");
  await expect(
    page.locator(".encyclopedia-index>button").first(),
  ).toContainText("Najdorf");
  await page.locator(".encyclopedia-index>button").first().click();
  const openingTitle = await page.locator(".encyclopedia-entry h2").innerText();
  await page
    .getByRole("button", { name: "Study opening", exact: true })
    .click();
  await expect(page.locator(".lesson-board-area h2")).toHaveText(openingTitle);
  await page.goto("/#learn/quizzes");
  await page.getByRole("button", { name: /Which Disney princess/ }).click();
  for (let i = 0; i < 6; i++)
    await page.locator(".quiz-moves>button").first().click();
  await expect(page.locator(".quiz-result")).toContainText("Mulan");
  await page.goto("/#learn/trivia");
  await expect(page.locator(".trivia-options>button")).toHaveCount(4);
  await page.locator(".trivia-options>button").first().click();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeVisible();
});
test("flags can be selected as backgrounds and persist; harder achievements start locked", async ({
  page,
}) => {
  await page.goto("/#profile");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Appearance" });
  await d.getByRole("tab", { name: "Background", exact: true }).click();
  await d.getByLabel("Background", { exact: true }).selectOption("Flag");
  await d.getByLabel("Country flag", { exact: true }).selectOption("JP");
  await expect(page.locator(".app")).toHaveCSS(
    "--background-image",
    /flags\/jp\.svg/,
  );
  await d.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/bg-flag/);
  const response = await page.request.get("/flags/jp.svg");
  expect(response.ok()).toBeTruthy();
  await page.goto("/#stats");
  await page.getByRole("button", { name: "Achievements", exact: true }).click();
  await expect(page.locator(".achievement")).toHaveCount(18);
  await expect(page.locator(".achievement.unlocked")).toHaveCount(0);
  await expect(page.locator(".achievement-grid")).toContainText(
    "90 consecutive days",
  );
});
