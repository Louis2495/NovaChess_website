import PuzzleThemePicker from "../components/PuzzleThemePicker";
import {useControl} from "../lib/controls";
import PuzzleMistake, {type PuzzleMistakePosition} from "../components/PuzzleMistake";
import { usePremoves } from "../lib/usePremoves";
import PuzzleChat from "../components/PuzzleChat";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Lightbulb, ArrowRight, RotateCcw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../lib/context";
import { useData, today, hintColor } from "../lib/store";
import type { PuzzleData } from "../lib/types";
import GuessEval from "./GuessEval";
import { dailyPuzzle } from "./Home";
import { Board, type BoardMark } from "../components/Board";
import {
  PageTitle,
  Card,
  Button,
  Loading,
} from "../components/UI";
export default function Puzzles() {
  const { detail: puzzleView, navigate: changePuzzleView } = useApp();
  if (puzzleView === "eval")
    return (
      <>
        <PageTitle title="Guess the eval">
          <Button
            className="secondary"
            onClick={() => changePuzzleView("puzzles")}
          >
            Puzzles
          </Button>
        </PageTitle>
        <GuessEval />
      </>
    );
  return <ClassicPuzzles />;
}
function ClassicPuzzles() {
  const { data, error } = useData<PuzzleData[]>("puzzles");
  if (!data) return <Loading error={error} />;
  return <PuzzleTrainer puzzles={data} />;
}
function PuzzleTrainer({ puzzles }: { puzzles: PuzzleData[] }) {
  const { library, setLibrary, detail, navigate, appearance } = useApp();
  const daily = detail === "daily";
  const [theme, setTheme] = useState("All themes");
  const pool = useMemo(
    () =>
      theme === "All themes"
        ? puzzles
        : puzzles.filter((p) => p.themes.includes(theme)),
    [puzzles, theme],
  );
  function choose(exclude?: string) {
    if (daily) {
      const saved = library.progress.daily[today()];
      return puzzles.find((p) => p.id === saved?.id) || dailyPuzzle(puzzles);
    }
    const unseen = pool.filter(
      (p) => p.id !== exclude && !library.progress.completed.includes(p.id),
    );
    const choices = unseen.length
      ? unseen
      : pool.filter((p) => p.id !== exclude);
    return (
      [...choices].sort(
        (a, b) =>
          Math.abs(a.sourceRating - library.progress.rating) -
            Math.abs(b.sourceRating - library.progress.rating) ||
          a.id.localeCompare(b.id),
      )[0] || pool[0]
    );
  }
  const [puzzle, setPuzzle] = useState(() => choose()),
    [cursor, setCursor] = useState(1),
    [fen, setFen] = useState(() => {
      const c = new Chess(puzzle.fen);
      c.move(puzzle.moves[0]);
      return c.fen();
    }),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false),
    [hint, setHint] = useState(""),
    [hintArrow,setHintArrow] = useState<BoardMark|null>(null),
    [wrong, setWrong] = useState(false),
    [played, setPlayed] = useState<string[]>([]);
  const [mistake,setMistake]=useState<PuzzleMistakePosition|null>(null);
  const [reviewIndex,setReviewIndex]=useState<number|null>(null);
  const reviewing=reviewIndex!==null;
  const history=useMemo(()=>{const board=new Chess(puzzle.fen);board.move(puzzle.moves[0]);const positions=[board.fen()];for(const move of played){board.move(move);positions.push(board.fen());}return positions;},[puzzle,played]);
  const layoutRef = useRef<HTMLDivElement>(null),
    puzzleBoardRef = useRef<HTMLDivElement>(null);
  const [ratingOffset, setRatingOffset] = useState(47);
  useLayoutEffect(() => {
    const measure = () => {
      const board = puzzleBoardRef.current?.querySelector(".board");
      if (board && layoutRef.current)
        setRatingOffset(
          board.getBoundingClientRect().top -
            layoutRef.current.getBoundingClientRect().top,
        );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (puzzleBoardRef.current) observer.observe(puzzleBoardRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fen]);
  const graded = useRef(daily && !!library.progress.daily[today()]);
  const learner = useMemo(() => {
    const c = new Chess(puzzle.fen);
    c.move(puzzle.moves[0]);
    return c.turn();
  }, [puzzle]);
  const c = new Chess(fen);
  function grade(correct: boolean) {
    if (graded.current) return;
    graded.current = true;
    setLibrary((l) => {
      if (daily && l.progress.daily[today()]) return l;
      const p = l.progress;
      const expected = 1 / (1 + 10 ** ((puzzle.sourceRating - p.rating) / 400));
      const k = p.attempts < 10 ? 400 : p.attempts < 25 ? 120 : 40;
      return {
        ...l,
        progress: {
          ...p,
          rating: Math.max(
            200,
            Math.min(3500, p.rating + k * ((correct ? 1 : 0) - expected)),
          ),
          attempts: p.attempts + 1,
          solved: p.solved + (correct ? 1 : 0),
          streak: correct ? p.streak + 1 : 0,
          completed: [...new Set([...p.completed, puzzle.id])],
          daily: daily
            ? {
                ...p.daily,
                [today()]: { id: puzzle.id, correct, completed: correct },
              }
            : p.daily,
        },
      };
    });
  }
  function complete() {
    const assisted = graded.current;
    grade(true);
    setDone(true);
    setMessage("");
    if (daily)
      setLibrary((l) => ({
        ...l,
        progress: {
          ...l.progress,
          daily: {
            ...l.progress.daily,
            [today()]: {
              ...(l.progress.daily[today()] || {
                id: puzzle.id,
                correct: !assisted,
              }),
              completed: true,
            },
          },
        },
      }));
  }
  function load(p: PuzzleData) {
    const c = new Chess(p.fen);
    c.move(p.moves[0]);
    setPuzzle(p);
    setFen(c.fen());
    setCursor(1);
    setDone(false);
    setMessage("");
    setHint("");setHintArrow(null);
    setWrong(false);
    setMistake(null);
    setPlayed([]);
    setReviewIndex(null);
    graded.current = daily && !!library.progress.daily[today()];
  }
  function attempt(from: string, to: string, promotion?: string) {
    if (done || reviewing || c.turn() !== learner) return;
    try {
      const ch = new Chess(fen),
        m = ch.move({ from, to, promotion: promotion || "q" }),
        uci = m.from + m.to + (m.promotion || "");
      if (uci !== puzzle.moves[cursor] && !ch.isCheckmate()) {
        grade(false);
        setWrong(true);
        setMistake({before:fen,after:ch.fen(),move:m.san});
        setMessage("Try another move.");
        return;
      }
      setFen(ch.fen());
      setPlayed((p) => [...p, m.san]);
      setCursor(cursor + 1);
      setWrong(false);
      setMistake(null);
      setHint("");setHintArrow(null);
      setMessage("");
      if (cursor + 1 >= puzzle.moves.length || ch.isCheckmate()) complete();
    } catch {}
  }
  useEffect(() => {
    if (done || c.turn() === learner || cursor >= puzzle.moves.length) return;
    const timer = setTimeout(() => {
      try {
        const ch = new Chess(fen),
          m = ch.move(puzzle.moves[cursor]);
        setFen(ch.fen());
        setPlayed((p) => [...p, m.san]);
        setCursor(cursor + 1);
      } catch {
        setMessage(
          "The puzzle reply could not be played. Skip to the next puzzle.",
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fen, cursor, puzzle, done]);
  const premove = usePremoves({
    fen,
    side: learner,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: !done && !reviewing,
    identity: puzzle.id,
    execute: (move) => attempt(move.slice(0, 2), move.slice(2, 4), move[4]),
  });
  function seekReview(index:number){
    premove.clear();
    const next=Math.max(0,Math.min(played.length,index));
    setReviewIndex(next===played.length?null:next);
  }
  useControl('previous',()=>seekReview((reviewIndex ?? played.length)-1));
  useControl('next',()=>seekReview((reviewIndex ?? played.length)+1));
  const themes = useMemo(
    () => [...new Set(puzzles.flatMap((p) => p.themes))].sort(),
    [puzzles],
  );
  const actions = (
<div className="puzzle-actions-right">
            {!done && <Button
              className="hint-button" aria-label="Hint" title="Hint"
              disabled={done || reviewing || c.turn() !== learner}
              onClick={() => {
                grade(false);
                const m = new Chess(fen).move(puzzle.moves[cursor]);
                if(hint===m.from){
                  setHintArrow({from:m.from,to:m.to,color:hintColor});
                  setMessage("Follow the arrow.");
                }else{
                  setHint(m.from);
                  setHintArrow(null);
                  setMessage("Try moving the highlighted piece.");
                }
              }}
            >
              <Lightbulb size={17} />
              <span className="puzzle-action-label">Hint</span>
            </Button>}
            {(!daily || done) && <Button
              className={done && !daily ? "puzzle-next-button" : undefined}
              aria-label={daily ? "Replay" : done ? "Next puzzle" : "Skip"}
              title={daily ? "Replay" : done ? "Next puzzle" : "Skip"}
              onClick={() => {
                if (daily) {
                  load(puzzle);
                } else {
                  if (!done) grade(false);
                  load(choose(puzzle.id));
                }
              }}
            >
              {daily ? <RotateCcw size={16} /> : !done ? <ArrowRight size={16} /> : null}{" "}
              <span className="puzzle-action-label">{daily ? "Replay" : done ? "Next puzzle" : "Skip"}</span>
            </Button>}
          </div>
  );
  return (
    <>
      <PageTitle
        title={daily ? "Daily puzzle" : "Puzzles"}
      >
        <Button
          className="secondary"
          onClick={() => navigate("puzzles", daily ? "" : "daily")}
        >
          <Calendar size={16} />
          {daily ? "Adaptive practice" : "Daily puzzle"}
        </Button>
        <Button
          className="secondary"
          onClick={() => navigate("puzzles", "eval")}
        >
          Guess the eval
        </Button>
      </PageTitle>
      <div
        className={`chess-layout puzzle-layout ${daily ? "daily-puzzle-layout" : ""}`}
        ref={layoutRef}
        style={
          {
            "--puzzle-rating-offset": `${ratingOffset}px`,
          } as React.CSSProperties
        }
      >
        <div className="board-column">
          <div className="puzzle-board-area">
          <div
            ref={puzzleBoardRef}
            className={`puzzle-board ${wrong ? "wrong" : ""} ${done ? "solved" : ""}`}
          >
            <Board
              fen={reviewing ? history[reviewIndex] : premove.preview}
              materialFen={reviewing ? history[reviewIndex] : fen}
              onCancelPremoves={premove.cancelOnRightClick}
              legalMoves={reviewing ? [] : c.turn() === learner ? undefined : premove.options}
              onMove={(from, to, promotion) =>
                c.turn() === learner
                  ? attempt(from, to, promotion)
                  : premove.enqueue(from + to + (promotion || ""))
              }
              disabled={done || reviewing || (c.turn() !== learner && !appearance.premoves)}
              flipped={learner === "b"}
              hint={reviewing ? "" : hint}
              guides={!reviewing && hintArrow?[hintArrow]:[]}
            />
          </div>
          </div>
          <PremoveQueue
            moves={premove.queue}
            undo={() => premove.setQueue((q) => q.slice(0, -1))}
            clear={premove.clear}
          />
          {daily && actions}
          <div className="puzzle-feedback" role="status">
            {message}
          </div>

        </div>
        <div className="side-panels">
          {!daily && <div className="puzzle-settings-row"><PuzzleThemePicker value={theme} themes={themes} onChange={value=>{
                setTheme(value);
                const choices=value==='All themes'?puzzles:puzzles.filter(p=>p.themes.includes(value));
                if(!done)grade(false);
                load([...choices].sort((a,b)=>Math.abs(a.sourceRating-library.progress.rating)-Math.abs(b.sourceRating-library.progress.rating))[0]);
              }}/></div>}
          <div className="puzzle-review-bar" role="group" aria-label="Puzzle move navigation">
            <Button className="secondary" aria-label="Previous puzzle move" disabled={(reviewIndex ?? played.length)===0} onClick={()=>seekReview((reviewIndex ?? played.length)-1)}><ChevronLeft size={19}/></Button>
            <input aria-label="Puzzle replay position" type="range" min={0} max={played.length} value={reviewIndex ?? played.length} disabled={!played.length} onChange={e=>seekReview(Number(e.target.value))}/>
            <Button className="secondary" aria-label="Next puzzle move" disabled={!reviewing} onClick={()=>seekReview((reviewIndex ?? played.length)+1)}><ChevronRight size={19}/></Button>
          </div>
          {mistake && <PuzzleMistake position={mistake}/>}
          {daily ? <PuzzleChat key={`${today()}/${puzzle.id}`} puzzleKey={`${today()}/${puzzle.id}`}/> : <>
          <Card>
            <div className="large-metric puzzle-rating">
              {Math.round(library.progress.rating)}
            </div>
          </Card>
          {played.length > 0 && (
            <Card className="puzzle-moves">
              <div className="card-heading">
                <h2>Moves</h2>
              </div>
              <div className="move-chips">
                {played.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </Card>
          )}
          {actions}
          </>}
        </div>
      </div>
    </>
  );
}
