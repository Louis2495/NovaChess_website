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
  const origin = square(page, "e2");
  await expect(origin).toHaveClass(/drag-origin/);
  expect(await origin.evaluate(e => getComputedStyle(e, "::after").display)).toBe("none");
  await page.mouse.up();
  await expect(page.locator(".notation-table")).toContainText("e4");
});
test("right click creates colored square marks and arrows, and controls change their colors", async ({
  page,
}) => {
  await page.goto("/#analysis");
  await square(page, "e4").click({ button: "right" });
  await expect(page.locator(".board-square[data-annotation]")).toHaveAttribute(
    "data-annotation",
    "#42d9ec",
  );
  await square(page, "d4").click({ button: "right", modifiers: ["Shift"] });
  await expect(square(page, "d4")).toHaveAttribute(
    "data-annotation",
    "#2684ff",
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
  await expect(page.locator(".board-square[data-annotation]")).toHaveAttribute(
    "data-annotation",
    "#12abcd",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".board-square[data-annotation]")).toHaveCount(0);
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
  expect(q.width).toBeCloseTo(target.width, 0);
  expect(q.height).toBeCloseTo(target.height, 0);
  await queen.click();
  await expect(page.locator(".notation-table")).toContainText("a8=Q");
});
test("opening desk collapses the catalog, exposes deep plans and branches and fits a full-height screen", async ({
  page,
}) => {
  await page.goto("/#learn/lessons");
  await page.getByRole("button", { name: "Browse openings" }).click();
  await page.locator(".opening-row").first().click();
  await expect(page.locator(".opening-list")).toHaveCount(0);
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "White’s plan", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.getByLabel("Lesson variation").locator("option").count())
    .toBeGreaterThanOrEqual(4);
  await page.getByLabel("Lesson variation").selectOption("1");
  await expect(page.getByLabel("Lesson variation")).toHaveValue("1");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pawn breaks", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator(".lesson-quiz>button")).toHaveCount(3);
  const boardArea = page.locator(".lesson-workspace .lesson-board-area");
  const topLeft = boardArea.locator(".board-square").first();
  const next = boardArea.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeInViewport({ ratio: 1 });
  await expect(topLeft).toHaveAttribute("aria-label", /^a8,/);
  await next.click();
  await expect(topLeft).toHaveAttribute("aria-label", /^a8,/);
  await expect(page.locator(".lesson-next")).toContainText("1 /");
  if ((await page.evaluate(() => innerHeight)) >= 700)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBeTruthy();
});
test("history shows one timeline, event images, and champion portraits with ratings", async ({
  page,
}) => {
  await page.route("https://en.wikipedia.org/w/api.php?**", route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("pilicense")).toBe("free");
    const titles = params.get("titles")!.split("|");
    return route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: {
      query: { pages: titles.map(title => ({
        title, pageimage: title + ".jpg",
        thumbnail: { source: "https://upload.wikimedia.org/test/history.png" },
      })) },
    } });
  });
  await page.route("https://upload.wikimedia.org/test/history.png", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEgQGA6WNimgAAAABJRU5ErkJggg==", "base64"),
  }));
  await page.goto("/#learn/history");
  await expect(page.locator(".history-event-list time").first()).toHaveText("600");
  await expect(page.locator(".history-event-list time").last()).toHaveText("2024");
  await expect(page.getByRole("searchbox", { name: "Search history" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "All eras" })).toHaveCount(0);
  await expect(page.getByText("Through 2024")).toHaveCount(0);
  await expect(page.locator(".history-event-explanation").getByRole("img", { name: "Chaturanga", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next event", exact: true }).click();
  await expect(page.locator(".history-paging")).toContainText("2 /");
  await page
    .getByRole("button", { name: "World champions", exact: true })
    .click();
  await expect(page.getByRole("img", { name: "Wilhelm Steinitz", exact: true })).toBeVisible();
  await expect(page.getByLabel("Show event ratings", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Peak FIDE 2882", exact: true })).toBeVisible();
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
test("famous games replay, autoplay, and complete GIF export work", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto("/#learn/famous");
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByRole("button", { name: /1858.*Opera Game/ }).click();
  await expect(
    page.getByRole("heading", { name: "The Opera Game", exact: true }),
  ).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Save game", exact: true })).toHaveCount(0);
  await expect(page.getByText("Viewed", { exact: true })).toHaveCount(0);
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
    await page.goto("/#variants");await page.getByRole("button",{name:"Computer",exact:true}).click();
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
        {timeout:15000},
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
    await expect(page.getByText("Black won", { exact: true })).toBeVisible();
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
      await page.getByRole("button",{name:"Computer",exact:true}).click();
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
  const d = page.getByRole("region", { name: "Appearance" });
  await d.getByRole("tab", { name: "Background", exact: true }).click();
  await d.getByLabel("Background", { exact: true }).selectOption("Flag");
  await d.getByLabel("Country flag", { exact: true }).selectOption("JP");
  await expect(page.locator(".app")).toHaveCSS(
    "--background-image",
    /flags\/jp\.svg/,
  );
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/bg-flag/);
  const response = await page.request.get("/flags/jp.svg");
  expect(response.ok()).toBeTruthy();
  await page.goto("/#stats");
  await page.getByRole("button", { name: "Achievements", exact: true }).click();
  await expect(page.locator(".stats-achievement-list > li")).toHaveCount(18);
  await expect(page.locator(".stats-achievement-progress span").filter({ hasText: /^Unlocked$/ })).toHaveCount(0);
  await expect(page.locator(".stats-achievement-list")).toContainText(
    "90 consecutive days",
  );
});

test("Study explains the move on the board as playback advances and goes back", async ({ page }) => {
  await page.goto("/#learn/lessons");
  const study = page.locator(".opening-study");
  const playback = page.locator(".lesson-board-area .lesson-step-controls");
  await expect(study).toContainText("Play the first move");
  await playback.getByRole("button", { name: "Next", exact: true }).click();
  await expect(study.getByRole("heading")).toHaveText(/^1\. e4$/);
  await playback.getByRole("button", { name: "Next", exact: true }).click();
  await expect(study.getByRole("heading")).toHaveText("1… e5");
  await playback.getByRole("button", { name: "Back", exact: true }).click();
  await expect(study.getByRole("heading")).toHaveText(/^1\. e4$/);
});

test("opening, trap, and endgame boards are large and fit the viewport", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  for (const route of ["lessons", "traps", "endgames"]) {
    await page.goto("/#learn/" + route);
    const board = page.locator(".viewport-lesson .board");
    await expect(board).toBeVisible();
    if (route === "traps") {
      const next = page.locator(".trap-board .lesson-step-controls").getByRole("button", { name: "Next", exact: true });
      await expect(next).toBeInViewport({ ratio: 1 });
      expect((await next.boundingBox())!.y).toBeGreaterThan((await board.boundingBox())!.y + (await board.boundingBox())!.height);
    }
    if (route !== "endgames") {
      const tabs = page.locator(".opening-lesson-panels").getByRole("group", { name: "Opening lessons section" });
      await expect(tabs.getByRole("button", { name: route === "traps" ? "Traps" : "Lessons" }))
        .toHaveAttribute("aria-pressed", "true");
      if (!mobile) {
        const browse = page.getByRole("button", { name: route === "traps" ? "Browse traps" : "Browse openings", exact: true });
        expect(Math.abs((await browse.boundingBox())!.y - (await tabs.boundingBox())!.y)).toBeLessThanOrEqual(1);
      }
    }
    await expect.poll(async () => {
      const bounds = (await board.boundingBox())!;
      const workspace = (await page.locator("#workspace").boundingBox())!;
      if (mobile) return Math.abs(bounds.x + bounds.width / 2 - workspace.x - workspace.width / 2);
      const panel = (await page.locator(".viewport-lesson > :is(.lesson-sidebar, .endgame-lesson-panels)").boundingBox())!;
      const square = bounds.width / 8;
      const [left, right] = route === "endgames" ? [3, 2] : [2, 1];
      return Math.max(Math.abs(bounds.x - workspace.x - square * left),
        Math.abs(panel.x - bounds.x - bounds.width - square * right));
    }).toBeLessThanOrEqual(mobile ? 2 : 24);
    await expect.poll(async () => (await board.boundingBox())!.width).toBeGreaterThan(mobile ? 195 : 500);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
  }
});

test("Train an opening shows three Stockfish lines and a left-side evaluation bar", async ({ page }) => {
  await page.goto("/#learn/train");
  const panel = page.getByRole("region", { name: "Stockfish analysis" });
  const lines = panel.getByRole("list", { name: "Top engine lines" }).getByRole("listitem");
  await expect(lines).toHaveCount(3);
  await expect(lines.last()).toContainText(/[+-]\d+\.\d+/, { timeout: 15000 });
  await expect(panel.locator("[aria-label='Evaluation value']")).toHaveText(/[+-]\d+\.\d+/);
  const meter = (await page.getByRole("img", { name: /^Evaluation [+-]/ }).boundingBox())!;
  const board = (await page.locator(".opening-training .board").boundingBox())!;
  expect(meter.x + meter.width).toBeLessThan(board.x);
  expect(Math.abs(meter.y - board.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(meter.height - board.height)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
});

test("Famous Games centers the board and move list and keeps playback and Explore in view", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: 664 });
  await page.goto("/#learn/famous");
  const back = page.getByRole("button", { name: "Back to Learn", exact: true });
  await expect(back).toBeInViewport({ ratio: 1 });
  const archive = (await page.locator(".master-archive").boundingBox())!;
  const backBounds = (await back.boundingBox())!;
  expect(Math.abs(backBounds.x - archive.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(backBounds.y - archive.y)).toBeLessThanOrEqual(1);
  const explore = page.getByRole("button", { name: "Explore", exact: true });
  const playback = page.getByRole("group", { name: "Replay controls" });
  const heading = page.locator(".master-notes .master-game-heading");
  await expect(heading.getByRole("heading", { level: 1 })).toBeVisible();
  expect((await heading.locator(".caption").boundingBox())!.y).toBeGreaterThan((await heading.getByRole("heading").boundingBox())!.y);
  await expect(explore).toBeInViewport({ ratio: 1 });
  await expect(playback).toBeInViewport({ ratio: 1 });
  await expect(playback.getByLabel("Replay speed")).toHaveCount(0);
  await expect(page.getByLabel("Replay speed")).toHaveCount(0);
  if (!mobile) {
    await expect.poll(async () => {
      const title = (await heading.getByRole("heading").boundingBox())!;
      const board = (await page.locator(".master-replay .board").boundingBox())!;
      return Math.abs(title.y - board.y);
    }).toBeLessThanOrEqual(1);
  }
  await expect.poll(async () => {
    const board = (await page.locator(".master-replay .board").boundingBox())!;
    const workspace = (await page.locator("#workspace").boundingBox())!;
    const moves = (await page.locator(".master-score").boundingBox())!;
    if (!mobile) {
      const button = (await explore.boundingBox())!;
      expect(moves.x - board.x - board.width).toBeGreaterThan(155);
      expect(button.x).toBeGreaterThan(board.x + board.width);
      expect(button.x + button.width).toBeLessThan(moves.x);
      expect(Math.abs(button.y - board.y)).toBeLessThanOrEqual(1);
    }
    const right = mobile ? board.x + board.width : moves.x + moves.width;
    return Math.abs((board.x + right) / 2 - workspace.x - workspace.width / 2);
  }).toBeLessThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
  if (!mobile) {
    const beforeHover = await explore.boundingBox();
    await page.mouse.move(0, 0);
    await explore.hover();
    await expect(explore).toHaveCSS("transform", "none");
    expect(await explore.boundingBox()).toEqual(beforeHover);
  }
  await explore.click();
  const dialog = page.getByRole("dialog", { name: "Explore famous games" });
  await expect(dialog.getByRole("textbox", { name: "Search famous games" })).toBeVisible();
  const another = dialog.locator(".master-game-rows button").nth(1);
  const title = await another.locator("b").innerText();
  await another.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(playback).toBeInViewport({ ratio: 1 });
});
