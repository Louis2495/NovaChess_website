import type {ReactNode} from "react";
import MultiplayerPicture from "../components/MultiplayerPicture";
import VariantIcon from "../components/VariantIcon";
import RoomChat from "../components/RoomChat";
import {previewRoomMove} from "../lib/roomPreview";
import {screenName} from "../lib/screenName";
import {matchTypedMove} from "../lib/moves";
import type {FairyStockfish} from "ffish-es6";
import {fairy, fog, squares} from "../lib/variants";
import {variantList} from "../lib/variantCatalog";
import {onlineLegal, specialVariants, type OnlinePosition} from "../lib/onlineVariants";
import {buildFen} from "../components/PositionEditor";
import {duration} from "../lib/speedrun";
import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Chess } from "chess.js";
import {
  ArrowRight,
  Copy,
  Flag,
  Handshake,
  Snowflake,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { online, onlineAction, useOnlineSession, roomBroadcastReady, onlineNow, syncOnlineClock } from "../lib/online";
import { useApp } from "../lib/context";
import { copyText,base } from "../lib/store";
import { specialLegal, type SpecialState } from "../lib/specialRules";
import { Board, Piece, type BoardMark } from "../components/Board";
import OnlineAccount from "../components/OnlineAccount";
import GameResult from "../components/GameResult";
import { ChoiceSelect, Button, Card, Field, PageTitle } from "../components/UI";
type Member = { id: string; team: "w" | "b" | null; board?:number };
type LastGame={id:string;result:string;white:string;black:string;reason:string;resignedBy?:string};
type Room = {
  id: string;
  name: string;
  mode: string;
  variant: string;
  state: SpecialState & { gameKey?:string; lastWinner?: string; lastResult?: string; lastGame?:LastGame; clock?:{remaining:{w:number;b:number};startedAt:number|null}; initial:string; partner?:OnlinePosition; speedrun?:OnlinePosition["speedrun"] };
  members: Member[];
  queue: string[];
  status: string;
  deadline: string | null;
  revision: number;
  marks: BoardMark[];
  settings: { bot: boolean };
};
type Profile = { id: string; username: string;screen_name?:string };
export default function Community({presetMode = "standard", presetVariant = "chess", timeControlSeconds = 180, incrementSeconds = 0, children}: {presetMode?: string; presetVariant?: string; timeControlSeconds?:number; incrementSeconds?:number; children?:ReactNode}) {
  const { session } = useOnlineSession(),
    { tab, detail, navigate, notify, appearance } = useApp();
  const [confirmed, setConfirmed] = useState<Room | null>(null),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [mode] = useState(presetMode),
    [name] = useState(presetMode === "standard" ? (variantList.find(v=>v.id===presetVariant)?.name || "Speedrun") : presetMode === "vote" ? "Vote Chess" : presetMode === "team" ? "Team Chess" : "Throne"),
    [variant] = useState(presetVariant),
    [bot, setBot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [votes, setVotes] = useState<
      { move: string; user_id: string; created_at: string }[]
    >([]),
    [armed, setArmed] = useState<"" | "freeze" | "swap">(""),
    [first, setFirst] = useState("");
  const [prediction,setPrediction]=useState<{roomId:string;revision:number;state:Room['state']}|null>(null),[dismissed,setDismissed]=useState<Record<string,string>>({});
  const pending=useRef(false),confirmedRef=useRef(confirmed);confirmedRef.current=confirmed;
  const room=prediction && confirmed?.id===prediction.roomId && confirmed.revision===prediction.revision?{...confirmed,state:prediction.state}:confirmed;
  const acceptRoom=useCallback((next:Room)=>{if(routeRef.current && routeRef.current!==next.id)return;setConfirmed(current=>current && current.id===next.id && current.revision>=next.revision?current:next);},[]);
  const pendingPrediction=useRef(false),requestId=useRef(0),submitted=useRef<{id:number;base:Room;move:string}|null>(null);
  const confirmedMove=(current:Room|null,base:Room,move:string)=>!!current && current.id===base.id && (
    (current.state.gameKey===base.state.gameKey && current.state.moves[base.state.moves.length]===move)
    || (!!base.state.gameKey && current.state.lastGame?.id===base.state.gameKey));
  useEffect(()=>{
    const sent=submitted.current;
    if(sent && sent.id===requestId.current && confirmedMove(confirmed,sent.base,sent.move)){
      submitted.current=null;pending.current=false;pendingPrediction.current=false;setBusy(false);
    }
  },[confirmed]);
  const [ff,setFF]=useState<FairyStockfish|null>(null),[pocket,setPocket]=useState(""),[duck,setDuck]=useState<{fen:string;options:string[];queued?:boolean}|null>(null),[typed,setTyped]=useState(""),[clock,setClock]=useState(Date.now());
  useEffect(()=>{if(!room || room.variant==="chess" || specialVariants.includes(room.variant))return;let active=true;fairy().then(engine=>{if(active)setFF(engine);}).catch(e=>setError(e.message));return()=>{active=false;};},[room?.variant]);
  useEffect(()=>{if((!room?.state.speedrun && !room?.state.clock) || room.status!=="playing")return;const t=setInterval(()=>setClock(Date.now()),100);return()=>clearInterval(t);},[room?.id,!!room?.state.speedrun,!!room?.state.clock,room?.status]);
  useEffect(()=>{if(room?.state.clock || room?.state.speedrun)void syncOnlineClock();},[room?.id,!!room?.state.clock,!!room?.state.speedrun]);
  useEffect(()=>{setPocket("");setDuck(null);},[room?.id,room?.revision]);
  const uid = session?.user.id;
  const [roomId, inviteQuery = ""] = detail.replace(/^online\//, "").split("?");
  const inviteTeam = new URLSearchParams(inviteQuery).get("team");
  const username = (id: string) =>
    screenName(profiles.find((p) => p.id === id));
  const routeRef=useRef(roomId);routeRef.current=roomId;
  useEffect(()=>{setConfirmed(null);setPrediction(null);pending.current=false;pendingPrediction.current=false;submitted.current=null;requestId.current++;setBusy(false);},[roomId]);
  const profileCache=useRef(new Map<string,Profile>());
  const loadProfiles=useCallback(async(ids:string[])=>{
    if(!online)return;const missing=[...new Set(ids)].filter(id=>!profileCache.current.has(id));
    if(!missing.length)return;
    const {data}=await online.from("profiles").select("id,username,screen_name").in("id",missing);
    for(const p of data||[])profileCache.current.set(p.id,p);
    setProfiles([...profileCache.current.values()]);
  },[]);
  const load=useCallback(async()=>{
    if(!online || !uid)return;
    if(roomId){
      const {data,error}=await online.from("rooms").select("*").eq("id",roomId).single();
      if(routeRef.current!==roomId)return;
      if(error){setError(error.message);return;}
      if(data){acceptRoom(data);void loadProfiles([...data.members.map((m:Member)=>m.id),...data.state.lastGame?[data.state.lastGame.white,data.state.lastGame.black]:[]]);}
    }else{
      setConfirmed(null);setPrediction(null);
    }
  },[uid,roomId,loadProfiles,acceptRoom]);
  useEffect(()=>{
    void load();if(!online || !uid)return;
    const refresh=()=>{if(document.visibilityState!=="hidden"){void load();if(confirmedRef.current?.state.clock || confirmedRef.current?.state.speedrun)void syncOnlineClock();}};
    window.addEventListener("online",refresh);window.addEventListener("focus",refresh);
    let channel:ReturnType<NonNullable<typeof online>['channel']>|null=null,active=true,fallback=false;
    const receive=(next:Room)=>{if(!active || next.id!==roomId)return;acceptRoom(next);void loadProfiles([...next.members.map(m=>m.id),...next.state.lastGame?[next.state.lastGame.white,next.state.lastGame.black]:[]]);};
    const subscribeFallback=()=>{
      if(!active || fallback)return;fallback=true;if(channel)void online!.removeChannel(channel);
      channel=online!.channel('room-'+roomId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},payload=>receive(payload.new as Room)).subscribe(status=>{if(status==='SUBSCRIBED')void load();});
    };
    if(roomId)void roomBroadcastReady().then(ready=>{
      if(!active)return;if(!ready){subscribeFallback();return;}
      channel=online!.channel('room:'+roomId,{config:{private:true}}).on('broadcast',{event:'state'},payload=>receive(payload.payload as Room)).subscribe(status=>{
        if(status==='SUBSCRIBED')void load();else if(status==='CHANNEL_ERROR' || status==='TIMED_OUT')subscribeFallback();
      });
    });
    return()=>{active=false;if(channel)void online!.removeChannel(channel);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);};
  },[uid,roomId,load,loadProfiles,acceptRoom]);
  useEffect(() => {
    if (!online || !room || room.mode !== "vote") return;
    const fetchVotes = async () => {
      const { data } = await online!
        .from("votes")
        .select("move,user_id,created_at")
        .eq("room_id", room.id)
        .eq("revision", room.state.moves.length);
      setVotes(data || []);
    };
    void fetchVotes();
    const filters={schema:"public",table:"votes",filter:`room_id=eq.${room.id}`};
    const ch=online.channel("votes-"+room.id)
      .on("postgres_changes",{...filters,event:"INSERT"},()=>void fetchVotes())
      .on("postgres_changes",{...filters,event:"UPDATE"},()=>void fetchVotes())
      .subscribe();
    return () => {
      void online?.removeChannel(ch);
    };
  }, [room?.id, room?.state.moves.length]);
  async function act(
    action: string,
    extra: Record<string, unknown> = {},
    rethrow = false,
  ) {
    if(pending.current){if(rethrow)throw Error('A move is still being confirmed.');return;}
    const ownRequest=++requestId.current;pending.current=true;setBusy(true);setError("");
    const base=confirmedRef.current;
    if(action==="move" && base){
      if(typeof extra.move==="string")submitted.current={id:ownRequest,base,move:extra.move};
      const side=base.members.find(m=>m.id===uid);
      const next=previewRoomMove(ff,base.variant,base.state,String(extra.move||""),side?.board||0,extra.specialAction);
      if(next){pendingPrediction.current=true;setPrediction({roomId:base.id,revision:base.revision,state:next as Room['state']});}
    }
    try {
      const result = await onlineAction({
        action,
        room: base?.id,
        revision: base?.revision,
        ...extra,
      });
      if (result.id) {
        acceptRoom(result);
        if (!roomId) navigate(result.mode === "standard" && result.variant === "chess" ? "play" : "variants", "online/"+result.id);
      }
      if(result.id)void loadProfiles(result.members?.map((m:Member)=>m.id)||[]);
      else if(action!=="vote")await load();
      if(requestId.current===ownRequest && (extra.specialAction || action!=="move")){setArmed("");setFirst("");}
    } catch (e) {
      if(requestId.current!==ownRequest || (base && typeof extra.move==="string" && confirmedMove(confirmedRef.current,base,extra.move)))return;
      setPrediction(null);await load();if(action!=="claim_timeout")setError((e as Error).message);
      if (rethrow) throw e;
    } finally {
      if(requestId.current===ownRequest){submitted.current=null;pending.current=false;pendingPrediction.current=false;setPrediction(null);setBusy(false);}
    }
  }
  const me = room?.members.find((m) => m.id === uid),
    position = room?.variant === "bughouse" && me?.board === 1 ? room.state.partner : room?.state,
    turn = position?.fen.split(" ")[1],
    canMove = room?.status === "playing" && me?.team === turn;
  const legal=useMemo(()=>{
    let legal:string[]=[];
  if (room && room.state.result === "*")
    try {
      legal =
        room.variant === "chess"
          ? new Chess(room.state.fen)
              .moves({ verbose: true })
              .map((m) => m.from + m.to + (m.promotion || ""))
          : specialVariants.includes(room.variant) ? specialLegal(room.state) : ff ? onlineLegal(ff,room.variant,room.state,me?.board||0) : [];
    } catch {}
    return legal;
  },[room?.state,room?.variant,me?.board,ff]);
  const premove = usePremoves({
    fen: position?.fen || "8/8/8/8/8/8/8/8 w - - 0 1",
    side: me?.team || "w",
    legal,
    enabled: !!me?.team,
    active: room?.status === "playing" && room.state.result === "*",
    identity: room?.id+":"+room?.state.gameKey,
    execute: (move) =>
      act(room?.mode === "vote" ? "vote" : "move", { move }, true),
    chaos: room?.variant === "chaos",
    blocked: room?.state.blocked || [],
  });
  function submitMove(move:string){return act(room?.mode === "vote" ? "vote" : "move",{move},true);}
  function movePiece(from:string,to:string,promotion?:string){
    const prefix=from+to+(promotion||"");
    if(!canMove && room?.variant!=="duck"){premove.enqueue(prefix);return;}
    let available=legal;
    if(!canMove && ff){const b=new ff.Board("duck",premove.preview);try{available=b.legalMoves().trim().split(/\s+/);}finally{b.delete();}}
    const choices=available.filter(m=>m.split(",")[0]===prefix);
    if(room?.variant === "duck" && choices[0]?.includes(",") && position && me?.team){
      const pieces=squares(canMove?position.fen:premove.preview),moving=pieces[from];
      if(moving?.toLowerCase()==="p" && from[0]!==to[0] && !pieces[to])delete pieces[to[0]+from[1]];
      delete pieces[from];for(const sq of Object.keys(pieces))if(pieces[sq]==="*")delete pieces[sq];
      pieces[to]=promotion?(me.team==="w"?promotion.toUpperCase():promotion):moving;
      if(moving?.toLowerCase()==="k" && Math.abs(from.charCodeAt(0)-to.charCodeAt(0))===2){const rFrom=(to[0]==="g"?"h":"a")+from[1],rTo=(to[0]==="g"?"f":"d")+from[1];pieces[rTo]=pieces[rFrom];delete pieces[rFrom];}
      setDuck({fen:buildFen(pieces,me.team,"",""),options:choices,queued:!canMove});return;
    }
    if(choices[0])void submitMove(choices[0]).catch(()=>{});
  }
  const pocketPieces=(position?.fen.match(/\[([^\]]*)\]/)?.[1]||"").split("").filter(p=>me?.team && (p===p.toUpperCase()?"w":"b")===me.team);
  const totals = Object.entries(
    votes.reduce(
      (acc, v) => ({ ...acc, [v.move]: (acc[v.move] || 0) + 1 }),
      {} as Record<string, number>,
    ),
  ).sort((a, b) => b[1] - a[1]);
  const variantTitle=room?.mode==='throne'?'Throne':room?.mode==='vote'?'Vote Chess':room?.mode==='team'?'Team Chess':variantList.find(v=>v.id===room?.variant)?.name || 'Speedrun';
  const last=room?.state.lastGame,resultKey=(room?.id||'')+':'+(uid||'');
  let seen:string|undefined=dismissed[resultKey];try{seen ||= sessionStorage.getItem('novachess-result-'+resultKey)||undefined;}catch{}
  const showLast=!!last && [last.white,last.black].includes(uid||'') && last.id!==seen;
  const dismissResult=()=>{if(!last)return;setDismissed(d=>({...d,[resultKey]:last.id}));try{sessionStorage.setItem('novachess-result-'+resultKey,last.id);}catch{}premove.clear();};
  const clockSide=room?.state.fen.split(' ')[1] as 'w'|'b',gameClock=room?.state.clock;
  const remaining=(side:'w'|'b')=>gameClock?Math.max(0,gameClock.remaining[side]-(room?.status==='playing' && clockSide===side && gameClock.startedAt!==null?Math.max(0,onlineNow()-gameClock.startedAt):0)):0;
  const timeoutRequested=useRef({key:'',at:0});
  useEffect(()=>{
    if(!room || !gameClock || !me?.team || room.status!=='playing' || remaining(clockSide)>0)return;
    const key=room.id+':'+room.revision;if((timeoutRequested.current.key===key && Date.now()-timeoutRequested.current.at<2000) || pending.current)return;timeoutRequested.current={key,at:Date.now()};
    void act('claim_timeout');
  },[clock,room?.revision,gameClock?.startedAt]);
  return (
    <>
      {!room && tab === "community" && <PageTitle title="Play" />}
      {room && <div className="online-game-heading"><div className="online-game-title">{['throne','vote','team'].includes(room.mode)?<MultiplayerPicture mode={room.mode}/> : room.variant==='speedrun'?<img className="speedrun-picture" src={`${base}variants/speedrun.webp`} alt=""/>:<VariantIcon id={room.variant} size={68}/>}<h1>{variantTitle}</h1></div><Button className="secondary" onClick={()=>navigate(room.mode==='standard' && room.variant==='chess'?'play':'variants')}>Back</Button></div>}
      {!online || !uid ? (
        <>
          <Card className="quick-online-play"><Button className="new-game-primary" disabled>{mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Start"}</Button></Card>
          {children}
          <OnlineAccount />
        </>
      ) : (
        <>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {room ? (
            <div className="chess-layout">
              <div className="board-column">
                {gameClock && <div className="online-clock-row" aria-label="Game clocks"><span role="timer" aria-label="White clock">{duration(remaining('w')).split('.')[0]}</span><span role="timer" aria-label="Black clock">{duration(remaining('b')).split('.')[0]}</span></div>}
                {room.state.speedrun && me?.team && <div className="speedrun-clock" role="timer" aria-label="Your move time">{duration(room.state.speedrun.elapsed[me.team]+(canMove && room.state.speedrun.startedAt!==null?Math.max(0,clock-room.state.speedrun.startedAt):0))}</div>}
                {room.variant === "blindtext" ? <form onSubmit={e=>{e.preventDefault();if(!ff || !position)return;const b=new ff.Board("chess",position.fen);try{const move=matchTypedMove(typed,legal.map(m=>({uci:m,san:b.sanMove(m)})));if(move)void submitMove(move).then(()=>setTyped("")).catch(()=>{});}finally{b.delete();}}}><Field label="Blindfold move"><input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off" disabled={!canMove || busy}/></Field><Button disabled={!canMove || busy}>Move</Button></form> : <Board
                  fen={duck?.fen || premove.preview}
                  hidden={room.variant === "blind"}
                  visible={room.variant === "cvfog" ? fog(position!.fen,me?.team || "w") : undefined}
                  highlights={[]}
                  overlay={showLast && last ? <div className="throne-round-result"><GameResult result={last.result} human={uid===last.white?"w":"b"}/><p>{last.resignedBy?`${last.resignedBy===uid?"You":username(last.resignedBy)} ${last.reason==="left"?"left the game":"resigned"}.`:last.reason==="draw"?"Draw":"Checkmate"}</p><Button onClick={dismissResult}>Continue</Button></div> : <GameResult result={room.variant === "bughouse" && me?.board === 1 && ["1-0","0-1"].includes(room.state.result) ? (room.state.result === "1-0" ? "0-1" : "1-0") : room.state.result} human={me?.team}/>}
                  materialFen={position?.fen}
                  onCancelPremoves={premove.cancelOnRightClick}
                  flipped={me?.team === "b"}
                  disabled={
                    (busy && !(pendingPrediction.current && !canMove && appearance.premoves)) ||
                    room.status !== "playing" ||
                    !me?.team ||
                    (!canMove && !appearance.premoves)
                  }
                  legalMoves={canMove ? legal : premove.options}
                  blocked={room.state.blocked || []}
                  marks={room.mode === "team" ? room.marks : undefined}
                  onMarksChange={
                    room.mode === "team" && me?.team
                      ? (marks) => void act("marks", { marks })
                      : undefined
                  }
                  onMove={movePiece}
                  onSquare={
                    duck ? square=>{const move=duck.options.find(m=>m.split(",")[1]?.endsWith(square));if(move){if(duck.queued){premove.enqueue(move);setDuck(null);}else void submitMove(move).catch(()=>{});}} : pocket ? square=>{const move=pocket.toUpperCase()+"@"+square;if(!canMove){premove.enqueue(move);setPocket("");}else if(legal.includes(move))void submitMove(move).catch(()=>{});} : armed
                      ? (square) => {
                          if (armed === "freeze")
                            void act("move", {
                              specialAction: { type: "freeze", square },
                            });
                          else if (!first) setFirst(square);
                          else
                            void act("move", {
                              specialAction: {
                                type: "swap",
                                from: first,
                                to: square,
                              },
                            });
                        }
                      : undefined
                  }
                  selected={pocket || first || room.state.randomFrom || undefined}
                  onCancel={
                    armed || pocket || duck
                      ? () => {
                          setPocket("");setDuck(null);
                          setArmed("");
                          setFirst("");
                        }
                      : undefined
                  }
                />}
                {!!pocketPieces.length && <div className="pockets">{[...new Set(pocketPieces)].map(p=><button key={p} aria-label={`Drop ${p.toUpperCase()}`} disabled={!canMove && !appearance.premoves} onClick={()=>setPocket(pocket===p?"":p)}><Piece symbol={p}/><span>{pocketPieces.filter(c=>c===p).length}</span></button>)}</div>}
                {room.variant === "bughouse" && room.state.partner && <Card><h2>Partner board</h2><Board compact fen={me?.board===1?room.state.fen:room.state.partner.fen} disabled flipped={me?.team!=="b"}/></Card>}
                <div className="button-row">
                  {room.variant === "chaos" && canMove && (
                    <>
                      <Button
                        className="secondary"
                        disabled={room.state.freezeUsed.includes(me!.team!)}
                        onClick={() => {
                          setArmed("freeze");
                          setFirst("");
                        }}
                      >
                        <Snowflake size={16} />
                        Freeze
                      </Button>
                      <Button
                        className="secondary"
                        disabled={room.state.swapUsed.includes(me!.team!)}
                        onClick={() => {
                          setArmed("swap");
                          setFirst("");
                        }}
                      >
                        <ArrowLeftRight size={16} />
                        Switch
                      </Button>
                    </>
                  )}
                  <PremoveQueue
                    moves={premove.queue}
                    undo={() => premove.setQueue((q) => q.slice(0, -1))}
                    clear={premove.clear}
                  />
                  {me?.team && room.settings.bot && (
                    <Button
                      className="draw-button"
                      disabled={busy || room.state.result !== "*"}
                      onClick={() => void act("draw")}
                    >
                      <Handshake size={16} />
                      Draw
                    </Button>
                  )}
                  {me?.team && room.mode !== "vote" && (
                    <Button
                      className="resign-button"
                      disabled={busy || room.state.result !== "*"}
                      onClick={() => void act("resign")}
                    >
                      <Flag size={16} />
                      Resign
                    </Button>
                  )}
                  {room.mode!=="throne" && <Button
                    className="secondary"
                    onClick={async () => {
                      const invite = new URL(location.href);
                      invite.hash = (room.mode === "standard" && room.variant === "chess" ? "play/online/" : "variants/online/")+room.id+(room.mode === "team" && me?.team ? "?team="+me.team : "");
                      const ok = await copyText(invite.href);
                      notify(ok ? "Invite link copied." : invite.href);
                    }}
                  >
                    <Copy size={16} />
                    Invite friends
                  </Button>}
                </div>
              </div>
              <div className="side-panels">
                {room.mode==='throne' && <RoomChat roomId={room.id} uid={uid!} nameFor={username} loadProfiles={loadProfiles}/>}
                <Card>
                  <h2>
                    {room.status === "waiting"
                      ? "Waiting for players"
                      : room.state.result !== "*"
                        ? "Game finished"
                        : room.mode === "vote" ? "Voting open" : "Playing"}
                  </h2>
                  <div className="team-rosters">
                    {["w", "b"].map((team) => (
                      <div key={team}>
                        <b>{team === "w" ? "White" : "Black"}</b>
                        {room.members
                          .filter((m) => m.team === team)
                          .map((m) => (
                            <span key={m.id}>
                              {username(m.id)}
                              {room.variant === "bughouse" ? ` · Board ${(m.board||0)+1}` : ""}
                              {m.id === uid ? " · you" : ""}
                            </span>
                          ))}
                        {team === "b" && room.settings.bot && (
                          <span>Computer</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!me && (
                    <Button disabled={busy} onClick={() => void act("join", room?.mode === "team" ? { team: inviteTeam } : {})}>
                      Join{room.mode === "throne" ? " the queue" : ""}
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  {room.mode === "throne" && (
                    <>
                      <h3>Queue</h3>
                      {room.queue.length ? (
                        room.queue.map((id, i) => (
                          <p key={id}>
                            {i + 1}. {username(id)}
                          </p>
                        ))
                      ) : (
                        <p className="caption">Queue is open.</p>
                      )}
                      {me && !me.team && !room.queue.includes(uid!) && (
                        <Button
                          disabled={busy}
                          onClick={() => void act("join", room?.mode === "team" ? { team: inviteTeam } : {})}
                        >
                          Join queue
                        </Button>
                      )}
                      {me && (
                        <Button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void act("finish")}
                        >
                          <LogOut size={16} />
                          Finish
                        </Button>
                      )}
                    </>
                  )}
                  {room.mode === "vote" && (
                    <>
                      <p className="caption">
                        24-hour ballot · earliest vote breaks ties.
                      </p>
                      {room.deadline && (
                        <p>Closes {new Date(room.deadline).toLocaleString()}</p>
                      )}
                      <div className="vote-results">
                        {totals.map(([move, n]) => (
                          <div key={move}>
                            <b>{move}</b>
                            <span>
                              {n} vote{n !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      {votes.some((v) => v.user_id === uid) && (
                        <p className="pill">Your vote is recorded</p>
                      )}
                    </>
                  )}
                </Card>
                <Card>
                  <div className="move-chips">
                    {(position?.notation || []).map((m, i) => (
                      <span key={i}>
                        {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                        {m}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="quick-online-play">
              {mode === "team" && <Field label="Opponent"><ChoiceSelect value={bot?"bot":"friends"} onChange={e=>setBot(e.target.value==="bot")}><option value="friends">Another team</option><option value="bot">Computer</option></ChoiceSelect></Field>}
              <Button className="new-game-primary" disabled={busy} onClick={async()=>{
                setBusy(true);setError("");
                try {
                  const listing=online!.from("room_lobby").select("id,name,mode,variant,status,member_count,updated_at,time_control,increment_seconds").eq("mode",mode).eq("variant",variant).order("status",{ascending:true}).order("updated_at",{ascending:true}).limit(40);
                  if(mode==="standard")listing.eq("status","waiting").lt("member_count",variant==="bughouse"?4:2);
                  if(mode==="standard" && variant==="chess")listing.eq("time_control",timeControlSeconds).eq("increment_seconds",incrementSeconds);
                  const {data,error}=await listing;
                  if(error)throw error;
                  const available=(data||[]).filter(r=>mode!=="standard" || variant!=="chess" || (r.time_control===timeControlSeconds && r.increment_seconds===incrementSeconds)).find(r=>mode === "throne" || mode === "vote" || (mode === "standard" && r.status === "waiting" && r.member_count < (variant === "bughouse" ? 4 : 2)));
                  if(available && !(mode === "team" && bot)) await act("join",{room:available.id});
                  else await act("create",{mode,name,timeControlSeconds,incrementSeconds,variant:mode === "vote" || mode === "team" && bot ? "chess" : variant,bot:mode === "team" && bot});
                }catch(e){setError((e as Error).message);}finally{setBusy(false);}
              }}>{busy ? "Connecting…" : mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Start"}</Button>
              {mode !== "standard" && <p className="caption">{ mode === "throne" ? "Winner stays. Queue to challenge." : mode === "vote" ? "One day per move. Earliest vote breaks a tie." : "Invite friends to your side. Share moves and arrows."}</p>}
            </Card>
          )}
          {!room && children}
        </>
      )}
    </>
  );
}
