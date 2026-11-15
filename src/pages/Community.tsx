import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import {
  Users,
  Plus,
  UserRound,
  Share2,
  Download,
  Upload,
  Copy,
  Trash2,
  Play,
  Eye,
  Save,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../lib/context";
import {
  uid,
  initialFen,
  download,
  copyText,
  imageFile,
  emptyLibrary,
} from "../lib/store";
import type { SavedGame } from "../lib/types";
import { Board } from "../components/Board";
import { PageTitle, Card, Button, Field, Modal, Empty } from "../components/UI";
import { parseGame, gamePGN } from "./Library";
function encode(data: unknown) {
  return btoa(
    String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function decode(text: string) {
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(
        atob(text.replaceAll("-", "+").replaceAll("_", "/")),
        (c) => c.charCodeAt(0),
      ),
    ),
  );
}
function validateTurn(raw: unknown): SavedGame {
  const g = raw as SavedGame;
  if (
    !g ||
    typeof g.initial !== "string" ||
    !Array.isArray(g.moves) ||
    g.moves.length > 1500 ||
    !g.moves.every((m) => typeof m === "string")
  )
    throw new Error("Invalid game file.");
  const c = new Chess(g.initial);
  const positions = [c.fen()],
    notation: string[] = [];
  for (const m of g.moves) {
    const move = c.move(m);
    positions.push(c.fen());
    notation.push(move.san);
  }
  return {
    id: typeof g.id === "string" ? g.id : uid(),
    title: typeof g.title === "string" ? g.title.slice(0, 100) : "Shared game",
    created: typeof g.created === "number" ? g.created : Date.now(),
    initial: g.initial,
    variant: "chess",
    moves: g.moves,
    notation,
    positions,
    result: c.isCheckmate()
      ? c.turn() === "w"
        ? "0-1"
        : "1-0"
      : c.isDraw()
        ? "1/2-1/2"
        : "*",
    human: g.human === "b" ? "b" : "w",
    folder: "Games",
    opponent:
      typeof g.opponent === "string" ? g.opponent.slice(0, 40) : "Friend",
    country:
      typeof g.country === "string" && /^[A-Z]{2}$/.test(g.country)
        ? g.country
        : undefined,
  };
}
export default function Community() {
  const { library, setLibrary, notify, detail, navigate, appearance } =
    useApp();
  const [tab, setTab] = useState("Profile"),
    [name, setName] = useState(library.profile.name),
    [country, setCountry] = useState(library.profile.country),
    [friendModal, setFriendModal] = useState(false),
    [friendName, setFriendName] = useState(""),
    [friendCountry, setFriendCountry] = useState(""),
    [friendNotes, setFriendNotes] = useState(""),
    [friend, setFriend] = useState(""),
    [game, setGame] = useState<SavedGame | null>(null),
    [incoming, setIncoming] = useState<SavedGame | null>(null),
    [readOnly, setReadOnly] = useState(false),
    [link, setLink] = useState(""),
    [cursor, setCursor] = useState(0);
  useEffect(() => {
    if (detail.startsWith("invite:") || detail.startsWith("watch:"))
      try {
        const data = decode(detail.slice(detail.indexOf(":") + 1));
        setIncoming(validateTurn(data.game));
        setReadOnly(detail.startsWith("watch:"));
        setTab("Shared games");
      } catch {
        notify("This game link is invalid.");
      }
  }, [detail]);
  const regions = useMemoRegions();
  function newGame() {
    const f = library.profile.friends.find((v) => v.id === friend);
    const g: SavedGame = {
      id: uid(),
      title: `${library.profile.name} – ${f?.name || "Friend"}`,
      created: Date.now(),
      initial: initialFen,
      variant: "chess",
      moves: [],
      notation: [],
      positions: [initialFen],
      result: "*",
      human: "w",
      folder: "Games",
      opponent: f?.name || "Friend",
      country: f?.country,
    };
    setGame(g);
    setCursor(0);
    setReadOnly(false);
  }
  function save(g = game) {
    if (!g) return;
    setLibrary((l) => ({
      ...l,
      games: [g, ...l.games.filter((v) => v.id !== g.id)],
    }));
    notify("Shared game saved to library.");
  }
  async function importFile(file: File) {
    try {
      if (file.size > 20e6) throw new Error("File must be smaller than 20 MB.");
      const text = await file.text();
      const g = file.name.endsWith(".pgn")
        ? parseGame(text)
        : validateTurn(JSON.parse(text).game);
      setIncoming(g);
      setTab("Shared games");
      setReadOnly(false);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function share(watch = false) {
    if (!game) return;
    const url = new URL(location.href);
    url.hash =
      "community/" +
      encodeURIComponent(
        (watch ? "watch:" : "invite:") +
          encode({ type: "novachess-turn", game }),
      );
    setLink(url.href);
    notify(
      (await copyText(url.href)) ? "Game link copied." : "Copy the link below.",
    );
  }
  async function restore(file: File) {
    try {
      if (file.size > 20e6) throw new Error("Backup is too large.");
      const data = JSON.parse(await file.text());
      if (
        data.type !== "novachess-library" ||
        !data.library ||
        !Array.isArray(data.library.games) ||
        !Array.isArray(data.library.repertoire) ||
        !data.library.progress ||
        !data.library.profile
      )
        throw new Error("Choose a NovaChess library backup.");
      const raw = data.library;
      for (const g of raw.games) {
        if (
          !g ||
          typeof g.id !== "string" ||
          typeof g.initial !== "string" ||
          !Array.isArray(g.moves) ||
          !Array.isArray(g.positions)
        )
          throw new Error("Backup contains an invalid game.");
      }
      for (const r of raw.repertoire) {
        if (
          !r ||
          typeof r.name !== "string" ||
          !Array.isArray(r.moves) ||
          typeof r.initial !== "string"
        )
          throw new Error("Backup contains an invalid repertoire line.");
        const c = new Chess(r.initial);
        r.moves.forEach((m: string) => c.move(m));
      }
      setLibrary({
        ...emptyLibrary,
        ...raw,
        profile: {
          ...emptyLibrary.profile,
          ...raw.profile,
          friends: Array.isArray(raw.profile.friends)
            ? raw.profile.friends
            : [],
        },
        progress: { ...emptyLibrary.progress, ...raw.progress },
      });
      notify("Library restored. Appearance is unchanged.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="Players & sharing"
        subtitle="Local profiles, friends and portable games"
      />
      <div className="segmented page-segments">
        {["Profile", "Friends", "Shared games", "Data"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Profile" ? (
        <div className="profile-layout">
          <Card>
            <div className="profile-avatar">
              {library.profile.avatar ? (
                <img src={library.profile.avatar} alt="Your profile" />
              ) : (
                <UserRound size={45} />
              )}
            </div>
            <label className="file-link">
              Choose profile picture
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    try {
                      const avatar = await imageFile(file, 256);
                      setLibrary((l) => ({
                        ...l,
                        profile: { ...l.profile, avatar },
                      }));
                    } catch (error) {
                      notify((error as Error).message);
                    }
                }}
              />
            </label>
            {library.profile.avatar && (
              <Button
                className="text-button"
                onClick={() =>
                  setLibrary((l) => ({
                    ...l,
                    profile: { ...l.profile, avatar: "" },
                  }))
                }
              >
                Remove picture
              </Button>
            )}
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
              />
            </Field>
            <Field label="Country (optional)">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Not set</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                setLibrary((l) => ({
                  ...l,
                  profile: { ...l.profile, name: name.trim(), country },
                }));
                notify("Local profile saved.");
              }}
            >
              <Save size={16} />
              Save profile
            </Button>
          </Card>
          <Card>
            <h2>Sharing</h2>
            <p>
              Your profile stays in this browser. Export it to share your
              display name and country.
            </p>
            <Button
              className="secondary"
              onClick={() =>
                download(
                  "novachess-profile.json",
                  JSON.stringify({
                    type: "novachess-profile",
                    name: library.profile.name,
                    country: library.profile.country,
                  }),
                )
              }
            >
              <Download size={16} />
              Export profile
            </Button>
            <p className="caption">
              No public directory or Game Center sign-in is used on the website.
            </p>
          </Card>
        </div>
      ) : tab === "Friends" ? (
        <>
          <div className="section-toolbar">
            <p className="muted">
              {library.profile.friends.length} local contacts
            </p>
            <div className="button-row">
              <label className="btn secondary file-button">
                <Upload size={15} />
                Import profile
                <input
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      if (f.size > 100000)
                        throw new Error("Profile is too large.");
                      const p = JSON.parse(await f.text());
                      if (
                        p.type !== "novachess-profile" ||
                        typeof p.name !== "string"
                      )
                        throw new Error("Invalid profile.");
                      setLibrary((l) => ({
                        ...l,
                        profile: {
                          ...l.profile,
                          friends: [
                            ...l.profile.friends,
                            {
                              id: uid(),
                              name: p.name.slice(0, 32),
                              country:
                                typeof p.country === "string" ? p.country : "",
                              notes: "",
                            },
                          ],
                        },
                      }));
                      notify("Friend added locally.");
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                />
              </label>
              <Button onClick={() => setFriendModal(true)}>
                <Plus size={16} />
                Add friend
              </Button>
            </div>
          </div>
          {library.profile.friends.length ? (
            <div className="friends-grid">
              {library.profile.friends.map((f) => (
                <Card key={f.id}>
                  <span className="avatar">{f.name[0]}</span>
                  <h3>{f.name}</h3>
                  <p className="caption">
                    {regions.find((r) => r.code === f.country)?.name ||
                      "Country not set"}
                  </p>
                  {f.notes && <p>{f.notes}</p>}
                  <div className="button-row">
                    <Button
                      className="secondary"
                      onClick={() => {
                        setFriend(f.id);
                        setTab("Shared games");
                      }}
                    >
                      <Play size={15} />
                      Play
                    </Button>
                    <Button
                      className="text-button"
                      onClick={() =>
                        setLibrary((l) => ({
                          ...l,
                          profile: {
                            ...l.profile,
                            friends: l.profile.friends.filter(
                              (v) => v.id !== f.id,
                            ),
                          },
                        }))
                      }
                    >
                      <Trash2 size={15} />
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Empty
                icon={<Users size={34} />}
                title="No friends added"
                description="Keep contacts locally, then exchange game files or links."
              />
            </Card>
          )}
        </>
      ) : tab === "Shared games" ? (
        <>
          <Card className="sharing-info">
            <Share2 size={21} />
            <p>
              Correspondence uses PGN / game files or snapshot links. Send the
              latest game to your friend after moving. Links are snapshots, not
              live broadcasts.
            </p>
          </Card>
          <div className="section-toolbar">
            <div className="button-row">
              <select
                aria-label="Choose friend"
                value={friend}
                onChange={(e) => setFriend(e.target.value)}
              >
                <option value="">Friend / pass & play</option>
                {library.profile.friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <Button onClick={newGame}>
                <Plus size={16} />
                New shared game
              </Button>
            </div>
            <label className="btn secondary file-button">
              <Upload size={15} />
              Import game
              <input
                type="file"
                accept=".pgn,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                }}
              />
            </label>
          </div>
          {incoming && (
            <Card className="incoming-game">
              <h3>{incoming.title}</h3>
              <p>
                {incoming.moves.length} half-moves ·{" "}
                {readOnly ? "Read-only replay" : "Playable game"}
              </p>
              <Button
                onClick={() => {
                  setGame(incoming);
                  setCursor(readOnly ? 0 : incoming.moves.length);
                  setIncoming(null);
                }}
              >
                Open game
                <ArrowRight size={15} />
              </Button>
            </Card>
          )}
          {game && (
            <div className="chess-layout">
              <div className="board-column">
                <Board
                  fen={game.positions[cursor]}
                  disabled={
                    readOnly ||
                    game.result !== "*" ||
                    cursor !== game.moves.length
                  }
                  onMove={(from, to, promotion) => {
                    try {
                      const c = new Chess(game.initial);
                      game.moves.forEach((m) => c.move(m));
                      const m = c.move({
                        from,
                        to,
                        promotion: promotion || "q",
                      });
                      const next = {
                        ...game,
                        moves: [
                          ...game.moves,
                          m.from + m.to + (m.promotion || ""),
                        ],
                        notation: [...game.notation, m.san],
                        positions: [...game.positions, c.fen()],
                        result: c.isCheckmate()
                          ? c.turn() === "w"
                            ? "0-1"
                            : "1-0"
                          : c.isDraw()
                            ? "1/2-1/2"
                            : "*",
                      };
                      setGame(next);
                      setCursor(next.moves.length);
                      setLibrary((l) => ({
                        ...l,
                        games: [
                          next,
                          ...l.games.filter((g) => g.id !== next.id),
                        ],
                      }));
                    } catch {
                      notify("Illegal move.");
                    }
                  }}
                />
                <div className="board-navigation">
                  <Button
                    className="secondary"
                    disabled={!cursor}
                    onClick={() => setCursor(cursor - 1)}
                  >
                    Back
                  </Button>
                  <span>
                    {cursor} / {game.moves.length}
                  </span>
                  <Button
                    className="secondary"
                    disabled={cursor >= game.moves.length}
                    onClick={() => setCursor(cursor + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <Card>
                <h2>{game.title}</h2>
                <p className="muted">
                  {game.result !== "*"
                    ? game.result
                    : `${game.positions.at(-1)!.split(" ")[1] === "w" ? "White" : "Black"} to move`}
                </p>
                <div className="share-grid">
                  <Button onClick={() => void share()}>
                    <Copy size={15} />
                    Copy game link
                  </Button>
                  <Button
                    className="secondary"
                    onClick={() => void share(true)}
                  >
                    <Eye size={15} />
                    Share replay
                  </Button>
                  <Button
                    className="secondary"
                    onClick={() =>
                      download(
                        "novachess-turn.json",
                        JSON.stringify({ type: "novachess-turn", game }),
                      )
                    }
                  >
                    <Download size={15} />
                    Game file
                  </Button>
                  <Button
                    className="secondary"
                    onClick={() =>
                      download(
                        "novachess-shared.pgn",
                        gamePGN(game),
                        "application/x-chess-pgn",
                      )
                    }
                  >
                    PGN
                  </Button>
                </div>
                {link && (
                  <Field label="Game link">
                    <textarea readOnly value={link} rows={3} />
                  </Field>
                )}
                <Button className="text-button" onClick={() => save()}>
                  Save to library
                </Button>
                <div className="move-chips">
                  {game.notation.map((m, i) => (
                    <span key={i}>{m}</span>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="profile-layout">
          <Card>
            <h2>Backups</h2>
            <p>
              Export games, repertoire, progress, profiles and appearance before
              clearing browser storage.
            </p>
            <Button
              onClick={() =>
                download(
                  "novachess-backup.json",
                  JSON.stringify(
                    {
                      type: "novachess-library",
                      version: 2,
                      library,
                      appearance,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={16} />
              Export backup
            </Button>
            <label className="btn secondary file-button">
              <Upload size={16} />
              Restore library
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void restore(f);
                }}
              />
            </label>
            <p className="caption">
              Restoring replaces your local library. You can restore appearance
              from the same backup in Customize → Import.
            </p>
          </Card>
          <Card>
            <h2>Local storage</h2>
            <p>
              All content is stored in this browser. No sign-in or remote backup
              is provided.
            </p>
            <Button className="secondary" onClick={() => navigate("library")}>
              Manage saved games
            </Button>
            <Button className="secondary" onClick={() => navigate("stats")}>
              Review progress
            </Button>
          </Card>
        </div>
      )}
      {friendModal && (
        <Modal title="Add friend" onClose={() => setFriendModal(false)}>
          <Field label="Name">
            <input
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              maxLength={32}
            />
          </Field>
          <Field label="Country">
            <select
              value={friendCountry}
              onChange={(e) => setFriendCountry(e.target.value)}
            >
              <option value="">Not set</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea
              value={friendNotes}
              onChange={(e) => setFriendNotes(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </Field>
          <Button
            disabled={!friendName.trim()}
            onClick={() => {
              setLibrary((l) => ({
                ...l,
                profile: {
                  ...l.profile,
                  friends: [
                    ...l.profile.friends,
                    {
                      id: uid(),
                      name: friendName.trim(),
                      country: friendCountry,
                      notes: friendNotes,
                    },
                  ],
                },
              }));
              setFriendName("");
              setFriendCountry("");
              setFriendNotes("");
              setFriendModal(false);
            }}
          >
            Save contact
          </Button>
        </Modal>
      )}
    </>
  );
}
function useMemoRegions() {
  const names = new Intl.DisplayNames(undefined, { type: "region" });
  const codes =
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
      " ",
    );
  return codes
    .map((code) => ({ code, name: names.of(code) || code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
