import test from "node:test";
import assert from "node:assert/strict";
import {
  federationId,
  parseFIDEProfile,
  parseUSCFProfile,
} from "../../src/lib/federations.ts";
test("federation inputs accept official IDs and profile URLs but reject unrelated hosts", () => {
  assert.equal(
    federationId("fide", "https://ratings.fide.com/profile/1503014"),
    "1503014",
  );
  assert.equal(
    federationId("fide", "https://ratings.fide.com/card.phtml?event=1503014"),
    "1503014",
  );
  assert.equal(
    federationId("uscf", "https://ratings.uschess.org/player/12641216"),
    "12641216",
  );
  assert.equal(
    federationId("uscf", "https://www.uschess.org/msa/MbrDtlMain.php?12641216"),
    "12641216",
  );
  assert.equal(federationId("uscf", "02507854"), "02507854");
  assert.throws(() => federationId("uscf", "123"));
  assert.throws(() =>
    federationId("fide", "https://example.com/profile/1503014"),
  );
  assert.throws(() =>
    federationId("fide", "https://ratings.fide.com.evil.test/profile/1503014"),
  );
});
test("the documented FIDE response preserves actual categories and missing ratings", () => {
  const record = parseFIDEProfile(
    {
      id: 35009192,
      name: "Erigaisi Arjun",
      title: "GM",
      federation: "IND",
      year: 2003,
      standard: 2746,
      rapid: 2740,
      blitz: 2766,
    },
    "35009192",
  );
  assert.equal(record.name, "Erigaisi Arjun");
  assert.equal(record.standard, 2746);
  assert.equal(record.rapid, 2740);
  assert.equal(record.source, "fide");
  assert.throws(() => parseFIDEProfile({ id: 1, name: "Other" }, "35009192"));
  assert.equal(
    parseFIDEProfile({ id: 35009192, name: "Example", standard: 0 }, "35009192")
      .standard,
    undefined,
  );
});
test("USCF table parsing does not mistake membership IDs, games or dates for ratings", () => {
  const html =
    "<h2>12641216: EXAMPLE PLAYER</h2><table><tr><td>Regular Rating</td><td>2510 (Based on 4940 games)</td></tr><tr><td>Quick Rating</td><td>2412</td></tr><tr><td>Blitz Rating</td><td>Unrated (2026-11-01)</td></tr></table>";
  const record = parseUSCFProfile(html, "12641216");
  assert.equal(record.name, "EXAMPLE PLAYER");
  assert.equal(record.standard, 2510);
  assert.equal(record.rapid, 2412);
  assert.equal(record.blitz, undefined);
  assert.equal(
    parseUSCFProfile(
      "<h2>12641216: UNRATED PLAYER</h2><tr><td>Regular Rating</td><td>Unrated (2026-11-01)</td></tr>",
      "12641216",
    ).standard,
    undefined,
  );
  assert.throws(() => parseUSCFProfile("<p>Player not found.</p>", "12641216"));
});
