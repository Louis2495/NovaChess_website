import {researchParser,cachedArchive,cacheArchive} from "../../lib/researchLoader";
import type {ResearchGame as PublicGame} from "../../lib/researchGames";
import ResearchLoadingAnimation from "../../components/ResearchLoadingAnimation";
import {screenName} from "../../lib/screenName";
import { isNovaChessGame } from "../../lib/library";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Download,
  LoaderCircle,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { initialFen, download } from "../../lib/store";
import { useEngine, useSettledEvaluation, scoreLabel } from "../../lib/engine";
import { Board } from "../../components/Board";
import { Card, Button } from "../../components/UI";
export default function Research() {
  const { appearance, library, tab } = useApp();
  const [site, setSite] = useState("Chess.com"),
    [username, setUsername] = useState(""),
    [identity, setIdentity] = useState(""),
    [games, setGames] = useState<PublicGame[]>([]),
    [path, setPath] = useState<string[]>([]),
    [side, setSide] = useState("w"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const c=useMemo(()=>{const board=new Chess();path.forEach(move=>board.move(move));return board;},[path]);
  const engine = useEngine(c.fen(), tab === "research" && !busy);
  const evaluation = useSettledEvaluation(c.fen(), engine.lines[0]);
  const white = evaluation?.score || 0;
  const matching = useMemo(
    () =>
      games.filter(
        (g) =>
          (g.color === "both" || g.color === side) &&
          path.every((m, i) => g.moves[i] === m),
      ),
    [games, path, side],
  );
  const branches = useMemo(() => {
    const map = new Map<
      string,
      {
        move: string;
        san: string;
        count: number;
        white: number;
        draw: number;
        black: number;
      }
    >();
    for (const g of matching) {
      const move = g.moves[path.length];
      if (!move) continue;
      const current = map.get(move) || {
        move,
        san: new Chess(c.fen()).move(move).san,
        count: 0,
        white: 0,
        draw: 0,
        black: 0,
      };
      current.count++;
      if (g.result === "1-0") current.white++;
      if (g.result === "0-1") current.black++;
      if (g.result === "1/2-1/2") current.draw++;
      map.set(move, current);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [matching, path]);
  async function load() {
    if (!username.trim()) return;
    setBusy(true);
    setError("");
    setStatus("0 games loaded");
    const ctrl = new AbortController();
    controller.current = ctrl;
    const loaded: PublicGame[] = [];
    const name = username.trim();
    let parser:ReturnType<typeof researchParser>|undefined;
    const parse=(pgns:string[]) => (parser??=researchParser(ctrl.signal)).parse(pgns,name);
    let retryAt=0;
    const pause=(ms:number)=>new Promise<void>((resolve,reject)=>{
      if(ctrl.signal.aborted){reject(new DOMException('Canceled','AbortError'));return;}
      const abort=()=>{clearTimeout(timer);reject(new DOMException('Canceled','AbortError'));};
      const timer=setTimeout(()=>{ctrl.signal.removeEventListener('abort',abort);resolve();},ms);
      ctrl.signal.addEventListener('abort',abort,{once:true});
    });
    async function json(url:string){
      for(let attempt=0;attempt<2;attempt++){
        if(retryAt>Date.now())await pause(retryAt-Date.now());
        const response=await fetch(url,{signal:ctrl.signal});
        if(response.status===429&&attempt===0){
          const header=response.headers.get('Retry-After');
          const wait=header?(Number.isFinite(Number(header))?Number(header)*1000:Date.parse(header)-Date.now()):1000;
          retryAt=Date.now()+Math.max(1000,Number.isFinite(wait)?wait:1000);continue;
        }
        if(!response.ok)throw new Error(response.status===429?'Rate limit reached. Retry later.':`Service returned HTTP ${response.status}.`);
        return response.json();
      }
    }
    try {
      if (site === "NovaChess") {
        if (name.toLowerCase() !== screenName(library.profile).toLowerCase())
          throw Error("No games saved on NovaChess for that screen name.");
        const records =
          library.activeGame &&
          !library.games.some((g) => g.id === library.activeGame?.id)
            ? [...library.games, library.activeGame]
            : library.games;
        for (const g of records.filter(
          (g) =>
            isNovaChessGame(g) &&
            ["chess", "blind", "blindtext"].includes(g.variant),
        )) {
          try {
            if(g.initial!==initialFen||!g.moves.length)continue;
            const opponent=screenName({name:g.opponent},g.opponent?'Opponent':'Computer');
            const white=g.human==='w'?name:opponent,black=g.human==='b'?name:opponent;
            let pgn:string;
            if(g.notation.length===g.moves.length){
              const quote=(value:string)=>value.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
              pgn=`[White "${quote(white)}"]\n[Black "${quote(black)}"]\n[Result "${g.result}"]\n\n${g.notation.map((san,i)=>(i%2?'':`${Math.floor(i/2)+1}. `)+san).join(' ')} ${g.result}`;
            }else{
              const board=new Chess(g.initial);g.moves.forEach(move=>board.move(move));board.setHeader('White',white);board.setHeader('Black',black);board.setHeader('Result',g.result);pgn=board.pgn();
            }
            loaded.push({moves:g.moves.slice(0,40),result:g.result,color:g.human,pgn});
          } catch {}
        }
      } else if (site === "Chess.com") {
        const archives = await json(
          `https://api.chess.com/pub/player/${encodeURIComponent(name)}/games/archives`,
        );
        const urls:string[]=archives.archives;
        const batches:PublicGame[][]=new Array(urls.length);let next=0,count=0;
        const now=new Date(),currentMonth=`/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}`;
        await Promise.all(Array.from({length:Math.min(2,urls.length)},async()=>{
          while(!ctrl.signal.aborted){
            const index=next++;if(index>=urls.length)return;
            const url=urls[index],key=`v1:${name.toLowerCase()}:${url}`;
            const cached=url.endsWith(currentMonth)?null:await cachedArchive(key);
            if(ctrl.signal.aborted)throw new DOMException('Canceled','AbortError');
            let games=cached;
            if(!games){
              const archive=await json(url);
              games=await parse((archive.games||[]).filter((g:{rules?:string})=>!g.rules||g.rules==='chess').map((g:{pgn?:string})=>g.pgn||''));
              if(!url.endsWith(currentMonth))await cacheArchive(key,games);
            }
            batches[index]=games;count+=games.length;
            if(!ctrl.signal.aborted)setStatus(`${count} games loaded`);
          }
        }));
        for(const batch of batches)for(const game of batch)loaded.push(game);
      } else {
        const r = await fetch(
          `https://lichess.org/api/games/user/${encodeURIComponent(name)}?moves=true&clocks=false&evals=false&opening=false`,
          { signal: ctrl.signal, headers: { Accept: "application/x-ndjson" } },
        );
        if (!r.ok) throw new Error(`Lichess returned HTTP ${r.status}.`);
        if (!r.body)
          throw new Error("Streaming is unavailable. Try again later.");
        const reader = r.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        const add=async(lines:string[])=>{
          const pgns:string[]=[];
          for(const line of lines){
            if(!line.trim())continue;
            const g=JSON.parse(line);if(g.variant!=='standard'||!g.moves)continue;
            const white=g.players?.white?.user?.name||g.players?.white?.user?.id||'';
            const black=g.players?.black?.user?.name||g.players?.black?.user?.id||'';
            const result=g.winner==='white'?'1-0':g.winner==='black'?'0-1':['draw','stalemate'].includes(g.status)?'1/2-1/2':'*';
            const escape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
            pgns.push(`[White "${escape(white)}"]\n[Black "${escape(black)}"]\n[Result "${result}"]\n\n${g.moves} ${result}`);
          }
          if(pgns.length)loaded.push(...await parse(pgns));
          if(!ctrl.signal.aborted)setStatus(`${loaded.length} games loaded`);
        };
        while(true){
          const {value,done}=await reader.read();if(done)break;
          buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';
          await add(lines);
        }
        buffer+=decoder.decode();if(buffer.trim())await add([buffer]);
      }
      setGames(loaded);
      setIdentity(`${site} · ${name}`);
      setPath([]);
      setStatus(`${loaded.length} games loaded`);
    } catch (e) {
      ctrl.abort();
      setError(
        (e as Error).name === "AbortError"
          ? "Loading canceled. Previous results retained."
          : `${(e as Error).message}${site === "NovaChess" ? "" : " Public access or browser CORS may be unavailable; try again later."}`,
      );
    } finally {
      parser?.close();
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <>
      <div className={`chess-layout research-layout ${games.length && !busy ? "research-loaded" : ""}`}>
        <div className="board-column">
          <div className="board-with-eval research-board-with-eval">
            <div className="eval-meter" role="img" aria-label={`Evaluation ${scoreLabel(evaluation)}`}>
              <div style={{height:`${50 + Math.tanh(white / 450) * 46}%`}}/>
            </div>
          <Board
            fen={c.fen()}
            guides={branches.map((b) => ({
              from: b.move.slice(0, 2),
              to: b.move.slice(2, 4),
              color: appearance.accent,
              opacity:
                0.2 +
                (0.75 * b.count) / Math.max(1, ...branches.map((m) => m.count)),
            }))}
            onMove={(from, to, promotion) => {
              try {
                const m = new Chess(c.fen()).move({
                  from,
                  to,
                  promotion: promotion || "q",
                });
                setPath((v) => [...v, m.from + m.to + (m.promotion || "")]);
              } catch {}
            }}
          />
          </div>
          <div className="board-navigation">
            <Button
              className="secondary"
              disabled={!path.length}
              onClick={() => setPath((v) => v.slice(0, -1))}
            >
              <ChevronLeft size={15} />
              Back
            </Button>
            <span>{Math.ceil(path.length / 2)} moves</span>
            <Button
              className="secondary"
              disabled={!path.length}
              onClick={() => setPath([])}
            >
              <RotateCcw size={15} />
              Reset
            </Button>
          </div>
        </div>
        <div className="side-panels research-panels">
      <Card className={`research-form${busy ? " is-loading" : ""}`}>
        <div className="research-fields">
          <div className="research-source field">
            <span>Source</span>
            <div className="segmented-control" role="group" aria-label="Source">
              {["NovaChess", "Chess.com", "Lichess"].map((value) => (
                <button
                  key={value}
                  aria-pressed={site === value}
                  onClick={() => {
                    setSite(value);
                    if (value === "NovaChess")
                      setUsername(screenName(library.profile));
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="research-username field"><span>Public username</span>
            <input aria-label="Public username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              maxLength={50}
            />
          </div>
          <div className="research-color field">
            <span>Color</span>
            <div
              className="segmented-control"
              role="group"
              aria-label="Player’s color"
            >
              {[
                ["w", "White"],
                ["b", "Black"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={side === value}
                  onClick={() => setSide(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button
            disabled={busy || !username.trim()}
            onClick={() => void load()}
          >
            <Search size={16} />
            Load games
          </Button>
        </div>

        {busy && <ResearchLoadingAnimation/>}

        {status && (
          <p role="status" className="feedback research-loading">
            {busy && (
              <LoaderCircle
                className="spin"
                size={16}
                aria-label="Loading games"
              />
            )}
            {status}
            {busy && (
              <Button className="secondary" onClick={() => controller.current?.abort()}>
                <X size={16} />Cancel
              </Button>
            )}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </Card>
        {games.length > 0 && <Card className="research-results">
          <div className="card-heading">
            <h2>{identity || "Opening explorer"}</h2>
            <span className="pill">{matching.length} games</span>
          </div>
          <div className="research-branches">
            {branches.map((b) => (
              <button
                key={b.move}
                onClick={() => setPath((v) => [...v, b.move])}
              >
                <b>{b.san}</b>
                <div>
                  <span>
                    {b.count} games ·{" "}
                    {Math.round((b.count / Math.max(1, matching.length)) * 100)}
                    %
                  </span>
                  <div className="result-bar">
                    <i style={{ width: `${(b.white / b.count) * 100}%` }} />
                    <i style={{ width: `${(b.draw / b.count) * 100}%` }} />
                    <i style={{ width: `${(b.black / b.count) * 100}%` }} />
                  </div>
                  <small>
                    White {b.white} · Draw {b.draw} · Black {b.black}
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
            {!branches.length && games.length > 0 && (
              <p className="muted">No continuations at this position.</p>
            )}
          </div>
          {games.length > 0 && (
            <Button
              className="text-button"
              onClick={() =>
                download(
                  "public-games.pgn",
                  games.map((g) => g.pgn).join("\n\n"),
                  "application/x-chess-pgn",
                )
              }
            >
              <Download size={14} />
              Export games
            </Button>
          )}
        </Card>}
        </div>
      </div>
    </>
  );
}
