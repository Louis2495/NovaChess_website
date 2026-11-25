import MultiplayerPicture from "../components/MultiplayerPicture";
import VariantIcon from "../components/VariantIcon";
import {SavedBoardPlayer} from "../components/BoardPlayer";
import {createPortal} from "react-dom";
import {screenName} from "../lib/screenName";
import { variantList } from "../lib/variants";
import { duration } from "../lib/speedrun";
import DailyMeme from "../components/DailyMeme";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, RotateCcw, Smartphone } from "lucide-react";
import { useApp } from "../lib/context";
import { useData, today, base, emptyLibrary } from "../lib/store";
import type { PuzzleData, SavedGame } from "../lib/types";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Button } from "../components/UI";
import { isStudy } from "../lib/library";
const multiplayerVariants = {
  vote: { name: "Vote Chess", description: "Vote with your team on the next move." },
  team: { name: "Team Chess", description: "Share moves and arrows with your teammates." },
  throne: { name: "Throne", description: "Join the queue to challenge the reigning winner." },
};

function variantShortcut(id: string) {
  if (Object.hasOwn(multiplayerVariants, id)) return { ...multiplayerVariants[id as keyof typeof multiplayerVariants], multiplayer: true };
  if (id === "speedrun") return { name: "Speedrun", description: "Beat the computer as fast as possible.", multiplayer: false };
  const variant = variantList.find(variant => variant.id === id && id !== "chess");
  return variant ? { name: variant.name, description: variant.description, multiplayer: false } : undefined;
}

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
  const puzzleRef=useRef<HTMLElement>(null),homeRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const puzzle=puzzleRef.current,home=homeRef.current;if(!puzzle||!home)return;
    const measure=()=>home.style.setProperty("--home-preview-height",`${puzzle.getBoundingClientRect().height}px`);
    const observer=new ResizeObserver(measure);observer.observe(puzzle);measure();return()=>observer.disconnect();
  },[]);
  const daily = !!library.progress.daily?.[today()]?.completed;
  const resumable = library.activeGame?.result === "*";
  const name = screenName(library.profile, "");
  const welcome = name && name !== emptyLibrary.profile.name ? `Welcome back, ${name}!` : "Welcome to Matein4";
  const games = library.games.filter(game => !isStudy(game) && game.folder !== "Studies");
  const recent = [...games].sort((a, b) => b.created - a.created).slice(0, 3);
  const lastSavedVariant = [...games, ...(library.activeGame ? [library.activeGame] : [])]
    .filter(game => game.origin !== "archive" && !isStudy(game) && (game.moves.length || game.partner?.moves.length))
    .sort((a, b) => b.created - a.created)
    .map(game => {
      const online = game.id.startsWith("online-");
      const mode = online && game.variant === "chess"
        ? Object.entries(multiplayerVariants).find(([, variant]) => variant.name === game.title)?.[0]
        : undefined;
      return { id: game.speedrun ? "speedrun" : mode ?? game.variant, online };
    })
    .find(game => game.id !== "vote" && variantShortcut(game.id));
  const lastPlayed = library.lastPlayedVariant ?? lastSavedVariant;
  const recentVariant = lastPlayed && lastPlayed.id !== "vote" ? variantShortcut(lastPlayed.id) : undefined;
  const appStoreUrl = import.meta.env.VITE_APP_STORE_URL?.trim();
  return (
    <div ref={homeRef} className={`home-page home-dashboard${appearance.showMemes ? "" : " memes-hidden"}`}>
      <section className="new-game-section home-welcome" aria-label="New game">
        <div className="home-welcome-art" aria-hidden="true"><span className="multiplayer-picture home-team-cutout" style={{backgroundImage:`url("${base}home-team.webp")`}}/></div>
        <div className="home-welcome-actions">
          <h1>{welcome}</h1>
          <Button className="new-game-primary" onClick={() => navigate("play")}>
            <Plus aria-hidden="true" /> New game
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
          ref={puzzleRef}
          className={`home-puzzle${daily ? " is-completed" : ""}`}
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
          <span className="home-puzzle-action">{daily ? "View puzzle" : "Solve puzzle"} <ArrowRight size={16} aria-hidden="true" /></span>
        </section>
        {appearance.showMemes && <DailyMeme/>}
      </div>
      <section className="home-recent" aria-labelledby="recent-games-title">
        <div className="home-section-heading">
          <h2 id="recent-games-title">Recent games</h2>
          <button className="text-link" onClick={() => navigate("library")}>
            View all
            <ArrowRight size={14} />
          </button>
        </div>
        {recent.length ? (
          <div className="home-recent-list">{recent.map((g) => (
            <RecentGame key={g.id} game={g} open={() => navigate("library", g.id)} />
          ))}</div>
        ) : (
          <div className="home-recent-empty">
            <img src={`${base}recent-games-empty.webp`} alt="" />
            <p>No games yet.</p>
            <Button className="secondary" onClick={() => navigate("play")}>
              Play your first game <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </div>
        )}
      </section>
      <div className="home-extras">
        <div className="home-app-group">
          <section className="home-app" aria-labelledby="home-app-title">
            <span className="home-app-icon"><Smartphone size={28} aria-hidden="true" /></span>
            <div>
              <h2 id="home-app-title">Try the app</h2>
              {appStoreUrl
                ? <a className="text-link" href={appStoreUrl}>Get Matein4 on the App Store <ArrowRight size={14} aria-hidden="true" /></a>
                : <p>Coming soon to the App Store</p>}
            </div>
          </section>
          <section className="home-free" aria-label="Free chess tools">
            <div className="home-free-copy">
              <strong>1000% Free</strong>
              <strong>No Ads</strong>
              <p>All the best chess tools in one place</p>
            </div>
            <img className="home-free-art" src={`${base}learn/studying-knight.webp`} alt="" width={512} height={614} />
          </section>
        </div>
        <div className="home-featured-group">
          <button type="button" className="home-featured" onClick={() => navigate("variants", "choose/vote")}>
            <MultiplayerPicture mode="vote" />
            <span>
              <strong>Vote Chess</strong>
              <span>{multiplayerVariants.vote.description}</span>
            </span>
          </button>
          {lastPlayed && recentVariant && (
            <button type="button" className="home-featured" onClick={() => navigate("variants", `choose/${lastPlayed.online ? "online/" : ""}${lastPlayed.id}`)}>
              {recentVariant.multiplayer ? <MultiplayerPicture mode={lastPlayed.id} />
                : lastPlayed.id === "speedrun" ? <img className="speedrun-picture" src={`${base}variants/speedrun.webp`} alt="" />
                : <VariantIcon id={lastPlayed.id} size={112} />}
              <span>
                <strong>{recentVariant.name}</strong>
                <span>{recentVariant.description}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentGame({ game: g, open }: { game: SavedGame; open: () => void }) {
  const {library}=useApp();
  const [preview, setPreview] = useState<number | null>(null);
  const scrubberRef=useRef<HTMLDivElement>(null);
  const positions = g.positions.length ? g.positions : [g.initial];
  const result = g.result === "*" ? "unfinished" : g.result === "1/2-1/2" ? "draw" :
    (g.result === "1-0") === (g.human === "w") ? "win" : "loss";
  const yours=(g.human==='w'?g.whiteName:g.blackName) || screenName(library.profile,"You"),opponent=(g.human==='w'?g.blackName:g.whiteName) || screenName({name:g.opponent},g.opponent || g.origin === "archive" ? "Opponent" : "Computer");
  const yourRating=g.humanRating ?? (g.origin==='archive'?undefined:library.localRating),opponentRating=g.opponentRating ?? g.botRating;
  const scores=g.result==='1-0'?['1','0']:g.result==='0-1'?['0','1']:g.result==='1/2-1/2'?['½','½']:['—','—'];
  const moves=Math.ceil(g.moves.length/2);
  const playedAt = new Date(g.created);
  return <div className={`recent-game-entry result-${result}`}>
    <button className="recent-game-row" onClick={open}>
      <span className="recent-players">{(['w','b'] as const).map((side,i)=><span className="recent-player" key={side}><span className={`recent-color-chip ${side==='w'?'white':'black'}`} aria-label={side==='w'?'White':'Black'}/><span className={`recent-player-score score-${scores[i]==='1'?'win':scores[i]==='0'?'loss':'draw'}`}>{scores[i]}</span><b><span className="recent-player-name" title={side===g.human?yours:opponent}>{side===g.human?yours:opponent}</span>{" "}<span>({(side===g.human?yourRating:opponentRating) ?? "—"})</span></b></span>)}</span>
      <span className="recent-variant-picture" role="img" aria-label={`${g.speedrun?'Speedrun':variantList.find(v=>v.id===g.variant)?.name || g.title} illustration`}>{g.speedrun ? <img src={`${base}variants/speedrun.webp`} alt=""/> : <VariantIcon id={g.variant} size={74}/>}</span>
      <span className="recent-game-details"><span>{g.speedrun ? "Speedrun" : variantList.find(v=>v.id===g.variant)?.name || g.title}</span><span>{moves} {moves===1?'move':'moves'}{g.timeControl ? ` · ${g.timeControl}` : ""}{g.speedrun ? ` · ${duration(g.speedrun.elapsedMs)}` : ""}</span><time dateTime={playedAt.toISOString()}>
        <span>{playedAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
        <span>{playedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
      </time></span>
    </button>
    <div ref={scrubberRef} className="recent-game-scrubber" onPointerLeave={() => setPreview(null)}>
      <input type="range" min={0} max={positions.length - 1} value={preview ?? 0}
        aria-label={`Preview ${g.title}`} onChange={e => setPreview(Number(e.target.value))}
        onFocus={() => setPreview(0)} onBlur={() => setPreview(null)}
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect();
          setPreview(Math.max(0, Math.min(positions.length - 1, Math.round((e.clientX-r.left)/r.width*(positions.length-1))))); }} />
      {preview !== null && <RecentGamePreview game={g} anchor={scrubberRef.current} fen={positions[preview] || g.initial} flipped={g.human === "b"}/>}
    </div>
  </div>;
}

function RecentGamePreview({game,anchor,fen,flipped}:{game:SavedGame;anchor:HTMLElement|null;fen:string;flipped:boolean}) {
 const ref=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState({left:0,top:0});
 useLayoutEffect(()=>{
  const popup=ref.current;if(!anchor||!popup)return;
  const place=()=>{
   const a=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect();
   setPosition({left:Math.max(8,Math.min(innerWidth-p.width-8,a.right-p.width)),top:Math.max(8,Math.min(innerHeight-p.height-8,a.top-p.height-12))});
  };
  const observer=new ResizeObserver(place);observer.observe(popup);place();
  window.addEventListener('scroll',place,true);window.addEventListener('resize',place);
  return()=>{observer.disconnect();window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);};
 },[anchor]);
 return createPortal(<div ref={ref} className="recent-game-preview" style={{position:'fixed',left:position.left,top:position.top,bottom:'auto',right:'auto',zIndex:1000}} aria-live="off"><SavedBoardPlayer game={game} side={flipped?'w':'b'} placement="top"/><Board fen={fen} flipped={flipped} disabled compact/><SavedBoardPlayer game={game} side={flipped?'b':'w'} placement="bottom"/></div>,document.querySelector('.app') || document.body);
}
