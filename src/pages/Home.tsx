import { useMemo } from "react";
import {
  ArrowRight,
  Puzzle,
  ScanLine,
  MonitorPlay,
  BookOpen,
  Flame,
  Trophy,
  Target,
  Plus,
  FolderOpen,
  Palette,
  ChartNoAxesCombined,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../lib/context";
import { useData, today, dateLabel } from "../lib/store";
import type { PuzzleData } from "../lib/types";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Card, Button, PageTitle } from "../components/UI";
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
  const { library, navigate, openAppearance } = useApp();
  const { data } = useData<PuzzleData[]>("puzzles");
  const puzzle = useMemo(() => (data ? dailyPuzzle(data) : null), [data]);
  let fen = "";
  if (puzzle) {
    const c = new Chess(puzzle.fen);
    c.move(puzzle.moves[0]);
    fen = c.fen();
  }
  const p = library.progress;
  const daily = !!p.daily[today()]?.completed;
  return (
    <>
      <PageTitle
        title="Home"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      >
        <Button onClick={() => navigate("play")}>
          <Plus size={16} />
          New game
        </Button>
      </PageTitle>
      <div className="dashboard-grid">
        <Card className="daily-card">
          <div className="card-heading">
            <span className="eyebrow">DAILY PUZZLE</span>
            <span className="pill">{daily ? "Completed" : "Not started"}</span>
          </div>
          <div className="daily-content">
            <div>
              <h2>Daily puzzle</h2>
              <p>
                {puzzle
                  ? `${fen.split(" ")[1] === "w" ? "White" : "Black"} to move`
                  : "Loading today’s position…"}
              </p>
              <div className="daily-stats">
                <span>
                  <Flame size={17} />
                  <b>{p.streak}</b> streak
                </span>
                <span>
                  <CheckIcon />
                  <b>{p.solved}</b> solved
                </span>
              </div>
              <Button onClick={() => navigate("puzzles", "daily")}>
                {daily ? "Replay" : "Solve puzzle"}
                <ArrowRight size={16} />
              </Button>
            </div>
            {fen && (
              <div className="board-link">
                <Board fen={fen} disabled compact />
              </div>
            )}
          </div>
        </Card>
        <Card className="resume-card">
          <div className="card-heading">
            <span className="eyebrow">PLAY</span>
            <MonitorPlay size={18} />
          </div>
          <h2>{library.activeGame ? "Continue your game" : "Play computer"}</h2>
          <p>
            {library.activeGame
              ? `${library.activeGame.variant} · ${library.activeGame.notation.length} half-moves`
              : "Choose your opponent, color and variant."}
          </p>
          <div className="resume-pieces">
            <span>♔</span>
            <span>♞</span>
            <span>♗</span>
          </div>
          <Button
            className="secondary"
            onClick={() => navigate("play", library.activeGame ? "resume" : "")}
          >
            {library.activeGame ? "Resume" : "New game"}
            <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
      <div className="stats-strip">
        {[
          { icon: Puzzle, label: "Puzzles solved", value: p.solved },
          { icon: Flame, label: "Current streak", value: p.streak },
          {
            icon: BookOpen,
            label: "Lessons completed",
            value: p.learned.length,
          },
          { icon: Trophy, label: "Games saved", value: library.games.length },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="stat-tile">
            <Icon size={20} />
            <span>
              <b>{value}</b>
              <small>{label}</small>
            </span>
          </Card>
        ))}
      </div>
      <div className="section-title">
        <h2>Tools</h2>
      </div>
      <div className="tool-grid">
        {[
          {
            title: "Analysis",
            text: "Stockfish, insights, FEN & PGN",
            icon: ScanLine,
            tab: "analysis" as const,
          },
          {
            title: "Puzzles",
            text: "4,000 adaptive positions",
            icon: Puzzle,
            tab: "puzzles" as const,
          },
          {
            title: "Your repertoire",
            text: "Build, import and train lines",
            icon: BookOpen,
            tab: "learn" as const,
            detail: "repertoire",
          },
          {
            title: "Endgames",
            text: "17 positions with engine replies",
            icon: Target,
            tab: "learn" as const,
            detail: "endgames",
          },
          {
            title: "Saved games",
            text: "Replay, organize and review",
            icon: FolderOpen,
            tab: "library" as const,
          },
          {
            title: "Research",
            text: "Explore public games and opening branches",
            icon: BookOpen,
            tab: "learn" as const,
            detail: "research",
          },
        ].map((t) => (
          <button
            className="tool-card card"
            key={t.title}
            onClick={() => navigate(t.tab, t.detail)}
          >
            <span className="tool-icon">
              <t.icon size={22} />
            </span>
            <div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </div>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      <div className="home-bottom">
        <Card>
          <div className="card-heading">
            <h2>Recent games</h2>
            <button className="text-link" onClick={() => navigate("library")}>
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          {library.games.length ? (
            library.games.slice(0, 3).map((g) => (
              <button
                className="list-row"
                key={g.id}
                onClick={() => navigate("library", g.id)}
              >
                <MonitorPlay size={20} />
                <span>
                  <b>{g.title}</b>
                  <small>
                    {dateLabel(g.created)} · {Math.ceil(g.moves.length / 2)}{" "}
                    moves
                  </small>
                </span>
                <span className="pill">
                  {g.result === "*" ? "Study" : g.result}
                </span>
              </button>
            ))
          ) : (
            <div className="inline-empty">
              <FolderOpen size={25} />
              <p>Finished games and saved studies appear here.</p>
              <Button
                className="secondary"
                onClick={() => navigate("analysis")}
              >
                Create a study
              </Button>
            </div>
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <h2>Your workspace</h2>
            <Palette size={19} />
          </div>
          <p className="muted">
            Set your background, board, pieces, colors and layout.
          </p>
          <div className="workspace-color-dots">
            <span />
            <span />
            <span />
            <span />
          </div>
          <Button className="secondary" onClick={openAppearance}>
            <Palette size={16} />
            Customize
          </Button>
          <button
            className="text-link workspace-progress"
            onClick={() => navigate("stats")}
          >
            <ChartNoAxesCombined size={16} />
            Progress & achievements
            <ArrowRight size={14} />
          </button>
        </Card>
      </div>
    </>
  );
}
function CheckIcon() {
  return <Target size={17} />;
}
