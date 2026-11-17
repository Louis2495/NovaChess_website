import {screenName} from "../lib/screenName";
import MultiplayerPicture from "../components/MultiplayerPicture";
import { variantList } from "../lib/variants";
import { duration } from "../lib/speedrun";
import DailyMeme from "../components/DailyMeme";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, RotateCcw } from "lucide-react";
import { useApp } from "../lib/context";
import { useData, today, dateLabel } from "../lib/store";
import type { PuzzleData, SavedGame } from "../lib/types";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Button, PageTitle } from "../components/UI";
export function dailyPuzzle(puzzles: PuzzleData[]) {
  const choices = puzzles
    .filter((p) => p.sourceRating >= 1000 && p.sourceRating <= 2200)
    .sort((a, b) => a.id.localeCompare(b.id));
  let hash = 14695981039346656037n;
  for (const b of new TextEncoder().encode(today()))
    hash = BigInt.asUintN(64, (hash ^ BigInt(b)) * 1099511628211n);
  return choices[Number(hash % BigInt(choices.length))];
}
export default function HomePage() {
  const { library, navigate, appearance } = useApp();
  const { data } = useData<PuzzleData[]>("puzzles");
  const puzzle = useMemo(() => (data ? dailyPuzzle(data) : null), [data]);
  let fen = "";
  if (puzzle) {
    const c = new Chess(puzzle.fen);
    c.move(puzzle.moves[0]);
    fen = c.fen();
  }
  const daily = !!library.progress.daily[today()]?.completed;
  const resumable = library.activeGame?.result === "*";
  return (
    <div className={`home-page ${appearance.showMemes ? "" : "memes-hidden"}`}>
      <PageTitle title="Home" />
      <section className="new-game-section home-welcome" aria-label="New game">
        <div className="home-welcome-art" aria-hidden="true"><MultiplayerPicture mode="team" /></div>
        <div className="home-welcome-actions">
        <Button className="new-game-primary" onClick={() => navigate("play")}>
          New game
        </Button>
        {resumable && (
          <button
            className="resume-link resume-game-button"
            onClick={() => navigate(library.activeGame?.variant !== "chess" || library.activeGame?.speedrun ? "variants" : "play", "resume")}
          >
            <RotateCcw size={15} />
            Resume saved game
          </button>
        )}
        </div>
      </section>
      <div className="home-practice-grid">
        <section
          className="home-puzzle"
          aria-labelledby="daily-title"
          role="link"
          tabIndex={0}
          onClick={() => navigate("puzzles", "daily")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("puzzles", "daily");
            }
          }}
        >
          <div className="home-section-heading">
            <h2 id="daily-title">Daily puzzle</h2>
            {daily && (
              <span className="completion-label">
                <Check size={14} />
                Complete
              </span>
            )}
          </div>
          <div className="home-puzzle-content">
            {fen ? (
              <div className="daily-board-preview" inert>
                <Board
                  fen={fen}
                  flipped={fen.split(" ")[1] === "b"}
                  disabled
                  compact
                />
              </div>
            ) : (
              <div className="daily-board-placeholder" />
            )}
          </div>
        </section>
        {appearance.showMemes && <DailyMeme />}
      </div>
      {library.games.length > 0 && (
        <section className="home-recent">
          <div className="home-section-heading">
            <h2>Recent games</h2>
            <button className="text-link" onClick={() => navigate("library")}>
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          {library.games.slice(0, 3).map((g) => (
            <RecentGame key={g.id} game={g} open={() => navigate("library", g.id)} />
          ))}
        </section>
      )}
    </div>
  );
}

function RecentGame({ game: g, open }: { game: SavedGame; open: () => void }) {
  const {library}=useApp();
  const [preview, setPreview] = useState<number | null>(null);
  const positions = g.positions.length ? g.positions : [g.initial];
  const result = g.result === "*" || g.result === "1/2-1/2" ? "draw" :
    (g.result === "1-0") === (g.human === "w") ? "win" : "loss";
  return <div className={`recent-game-entry result-${result}`}>
    <button className="recent-game-row" onClick={open}>
      <span className={`recent-color-chip ${g.human === "w" ? "white" : "black"}`} title={`You played ${g.human === "w" ? "White" : "Black"}`} aria-label={`You played ${g.human === "w" ? "White" : "Black"}`} />
      <span className="recent-game-info"><b>{screenName(library.profile,"You")} <span className="recent-versus">vs</span> {screenName({name:g.opponent},g.opponent || g.origin === "archive" ? "Opponent" : "Computer")}{g.botRating ? ` · ${g.botRating}` : ""}</b><small>{g.speedrun ? "Speedrun" : variantList.find(v=>v.id===g.variant)?.name || g.title} · {Math.ceil(g.moves.length / 2)} moves{g.timeControl ? ` · ${g.timeControl}` : ""}{g.speedrun ? ` · ${duration(g.speedrun.elapsedMs)}` : ""} · {dateLabel(g.created)}</small></span>
      <span className="game-result-label">{g.result === "*" ? "Study" : g.result}</span>
      <ChevronRight size={15} />
    </button>
    <div className="recent-game-scrubber" onPointerLeave={() => setPreview(null)}>
      <input type="range" min={0} max={positions.length - 1} value={preview ?? 0}
        aria-label={`Preview ${g.title}`} onChange={e => setPreview(Number(e.target.value))}
        onFocus={() => setPreview(0)} onBlur={() => setPreview(null)}
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect();
          setPreview(Math.max(0, Math.min(positions.length - 1, Math.round((e.clientX-r.left)/r.width*(positions.length-1))))); }} />
      {preview !== null && <div className="recent-game-preview" aria-live="off">
        <Board fen={positions[preview] || g.initial} flipped={g.human === "b"} disabled compact />
      </div>}
    </div>
  </div>;
}
