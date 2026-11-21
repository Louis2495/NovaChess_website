import { clampTeamComputerRating, teamComputerDefaultRating, teamComputerMaxRating, teamComputerMinRating, teamComputerRatingStep } from "../lib/teamComputer";
import {GameScore} from "../components/BoardPlayer";
import {createPortal} from "react-dom";
import type { SavedGame } from "../lib/types";
import type {ReactNode} from "react";
import type {Player} from "../lib/players";
import FriendPicker from "../components/FriendPicker";
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
  Users,
  X,
  Flag,
  Handshake,
  Snowflake,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { online, onlineAction, finishThroneOnPageExit, useOnlineSession, roomBroadcastReady, onlineNow, syncOnlineClock } from "../lib/online";
import { useApp } from "../lib/context";
import { base } from "../lib/store";
import { specialLegal, type SpecialState } from "../lib/specialRules";
import { Board, Piece, type BoardMark } from "../components/Board";
import OnlineAccount from "../components/OnlineAccount";
import GameResult from "../components/GameResult";
import { ChoiceSelect, Button, Card, Field, PageTitle } from "../components/UI";
type Member = { id: string; team: "w" | "b" | null; board?:number };
type LastGame={id:string;result:string;white:string;black:string;reason:string;resignedBy?:string;position?:Room["state"]};
type Room = {
  id: string;
  host: string;
  name: string;
  mode: string;
  variant: string;
  state: SpecialState & { drawOffer?:"w"|"b"; gameKey?:string; lastWinner?: string; lastResult?: string; lastGame?:LastGame; clock?:{remaining:{w:number;b:number};startedAt:number|null}; initial:string; partner?:OnlinePosition; speedrun?:OnlinePosition["speedrun"] };
  members: Member[];
  queue: string[];
  status: string;
  deadline: string | null;
  revision: number;
  marks: BoardMark[];
  settings: { bot: boolean; botRating?: number; invitedFriend?: string };
};
type Profile = { id: string; username: string;screen_name?:string; rating?:number };
export default function Community({presetMode = "standard", presetVariant = "chess", timeControlSeconds = 180, incrementSeconds = 0, children, friendSettingsHost}: {presetMode?: string; presetVariant?: string; timeControlSeconds?:number; incrementSeconds?:number; children?:ReactNode; friendSettingsHost?:HTMLElement|null}) {
  const { session } = useOnlineSession(),
    { tab, detail, navigate, notify, appearance, setLibrary } = useApp();
  const [confirmed, setConfirmed] = useState<Room | null>(null),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [mode] = useState(presetMode),
    [name] = useState(presetMode === "standard" ? (variantList.find(v=>v.id===presetVariant)?.name || "Speedrun") : presetMode === "vote" ? "Vote Chess" : presetMode === "team" ? "Team Chess" : "Throne"),
    [variant] = useState(presetVariant),
    [bot, setBot] = useState(false),
    [botRating, setBotRating] = useState(String(teamComputerDefaultRating)),
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
  const roundHistory = useRef(new Map<string, Room["state"]>());
  if (room?.state.gameKey) {
    roundHistory.current.set(room.state.gameKey, room.state);
    if (roundHistory.current.size > 4) roundHistory.current.delete(roundHistory.current.keys().next().value!);
  }
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
  const [roomId, inviteQuery = ""] = detail.startsWith("choose/") ? [""] : detail.replace(/^online\//, "").split("?");
  const inviteParams = new URLSearchParams(inviteQuery);
  const inviteTeam = inviteParams.get("team");
  const promptForTeammates = inviteParams.has("inviteTeammates");
  const username = (id: string) =>
    screenName(profiles.find((p) => p.id === id));
  const routeRef=useRef(roomId);routeRef.current=roomId;
  useEffect(()=>{setConfirmed(null);setPrediction(null);pending.current=false;pendingPrediction.current=false;submitted.current=null;requestId.current++;setBusy(false);},[roomId]);
  const tokenRef = useRef(session?.access_token);
  tokenRef.current = session?.access_token;
  useEffect(() => {
    if (!uid || !roomId) return;
    const isInThrone = () => {
      const current = confirmedRef.current;
      return current?.id === roomId && current.mode === "throne" && current.members.some(member => member.id === uid);
    };
    let pageExited = false;
    const onPageExit = () => {
      if (!isInThrone() || !tokenRef.current) return;
      pageExited = true;
      finishThroneOnPageExit(roomId, tokenRef.current);
    };
    window.addEventListener("pagehide", onPageExit);
    return () => {
      window.removeEventListener("pagehide", onPageExit);
      if (pageExited || !isInThrone()) return;
      const request = { action: "finish", room: roomId };
      void onlineAction(request).catch(() => onlineAction(request)).catch(() => {});
    };
  }, [roomId, uid]);
  const profileCache=useRef(new Map<string,Profile>());
  const loadProfiles=useCallback(async(ids:string[])=>{
    if(!online)return;const missing=[...new Set(ids)].filter(id=>!profileCache.current.has(id));
    if(!missing.length)return;
    const {data}=await online.from("profiles").select("id,username,screen_name,rating").in("id",missing);
    for(const p of data||[])profileCache.current.set(p.id,p);
    setProfiles([...profileCache.current.values()]);
  },[]);
  const navigateRef=useRef(navigate);
  navigateRef.current=navigate;
  const load=useCallback(async()=>{
    if(!online || !uid)return;
    if(roomId){
      const {data,error}=await online.from("rooms").select("*").eq("id",roomId).single();
      if(routeRef.current!==roomId)return;
      if(error){setError(error.message);return;}
      if(data && tab==="play" && (data.mode!=="standard" || data.variant!=="chess")){
        navigateRef.current("variants","online/"+roomId);
        return;
      }
      if(data){acceptRoom(data);void loadProfiles([...data.members.map((m:Member)=>m.id),...data.state.lastGame?[data.state.lastGame.white,data.state.lastGame.black]:[]]);}
    }else{
      setConfirmed(null);setPrediction(null);
    }
  },[uid,roomId,loadProfiles,acceptRoom,tab]);
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
      if (action === "cancel_friend_request" || action === "leave") {
        if (routeRef.current === base?.id) navigate(base?.mode === "standard" && base.variant === "chess" ? "play" : "variants");
        return;
      }
      if (result.id) {
        if (action === "move" && result.mode !== "vote") {
          const id = result.mode === "standard" ? result.variant : result.mode;
          if (id !== "chess") setLibrary(l => ({ ...l, lastPlayedVariant: { id, online: true } }));
        }
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
    variant:room?.variant,
    fen: position?.fen || "8/8/8/8/8/8/8/8 w - - 0 1",
    side: me?.team || "w",
    legal,
    enabled: !!me?.team,
    active: room?.status === "playing" && room.state.result === "*",
    identity: room?.id+":"+room?.state.gameKey+":"+me?.team+":"+me?.board,
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
  const pocketPieces=((canMove ? position?.fen : premove.preview)?.match(/\[([^\]]*)\]/)?.[1]||"").split("").filter(p=>me?.team && (p===p.toUpperCase()?"w":"b")===me.team);
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
  const canLeave = room?.mode === "standard" && room.variant !== "bughouse" && !!me?.team &&
    room.state.moves.length <= (me.team === "b" ? 1 : 0);
  const clockSide=room?.state.fen.split(' ')[1] as 'w'|'b',gameClock=room?.state.clock;
  const remaining=(side:'w'|'b')=>gameClock?Math.max(0,gameClock.remaining[side]-(room?.status==='playing' && clockSide===side && gameClock.startedAt!==null?Math.max(0,onlineNow()-gameClock.startedAt):0)):0;
  const timeoutRequested=useRef({key:'',at:0});
  useEffect(()=>{
    if(!room || !gameClock || !me?.team || room.status!=='playing' || remaining(clockSide)>0)return;
    const key=room.id+':'+room.revision;if((timeoutRequested.current.key===key && Date.now()-timeoutRequested.current.at<2000) || pending.current)return;timeoutRequested.current={key,at:Date.now()};
    void act('claim_timeout');
  },[clock,room?.revision,gameClock?.startedAt]);
  function reviewGame(previous = false) {
    if (!room) return;
    const state = previous && last ? last.position || roundHistory.current.get(last.id) : position;
    if (!state) { notify("This older round has no recorded moves available for review."); return; }
    const human = previous && last ? (last.white === uid ? "w" : "b") : me?.team || "w";
    const id = `online-${room.id}-${previous && last ? last.id : state.gameKey || "game"}`;
    const game: SavedGame = {
      id, kind:"game", origin:"novachess", title:room.name, created:Date.now(),
      initial:state.initial || state.positions[0] || state.fen,
      variant:room.variant, moves:state.moves, notation:state.notation, positions:state.positions,
      result:previous && last ? last.result : state.result, human, folder:"Games",
      whiteName:room.members.filter(m=>m.team==='w').map(m=>username(m.id)).join(", "),
      blackName:room.settings.bot ? "Computer" : room.members.filter(m=>m.team==='b').map(m=>username(m.id)).join(", "),
      humanRating:profiles.find(p=>p.id===uid)?.rating,
      opponentRating:room.settings.bot ? clampTeamComputerRating(room.settings.botRating) : profiles.find(p=>room.members.some(m=>m.id===p.id && m.team && m.team!==human))?.rating,
      opponent:room.settings.bot ? "Computer" : room.members.filter(m => m.team && m.team !== human).map(m => username(m.id)).join(", "),
      ...(specialVariants.includes(room.variant) && "blocked" in state ? {special:state} : {}),
    };
    setLibrary(l => ({...l, games:[game,...l.games.filter(g => g.id !== id)]}));
    navigate("library", id);
  }
  function playerStrip(side: "w" | "b", placement: "top" | "bottom") {
    if (!room) return null;
    const members = room.members.filter(m => m.team === side &&
      (room.variant !== "bughouse" || (m.board || 0) === (me?.board || 0)));
    return <div className={`online-player-strip player-${placement}`} aria-label={`${side === "w" ? "White" : "Black"} player`}>
      {gameClock && <span className={`online-player-clock turn-clock${room.status === "playing" && room.state.result === "*" && clockSide === side ? " is-active" : ""}`} role="timer" aria-label={`${side === "w" ? "White" : "Black"} clock`}>{duration(remaining(side)).split('.')[0]}</span>}
      {room.state.speedrun && me?.team === side && <span className={`online-player-clock turn-clock speedrun-clock${canMove ? " is-active" : ""}`} role="timer" aria-label="Your move time">
        {duration(room.state.speedrun.elapsed[side]+(canMove && room.state.speedrun.startedAt!==null?Math.max(0,clock-room.state.speedrun.startedAt):0))}
      </span>}
      <div className="online-player-identity">{members.map(member => {
        const profile = profiles.find(p => p.id === member.id);
        return <div key={member.id}><b><GameScore result={position?.result} side={side}/> {username(member.id)}</b><span className="caption">{profile?.rating ?? "—"}</span></div>;
      })}{side === "b" && room.settings.bot && <div><b>Computer</b><span className="caption">{clampTeamComputerRating(room.settings.botRating) === teamComputerMaxRating ? "Max strength" : clampTeamComputerRating(room.settings.botRating)}</span></div>}
      {!members.length && !(side === "b" && room.settings.bot) && <b>Waiting for opponent</b>}</div>
    </div>;
  }
  const [boardFlipped,setBoardFlipped]=useState<boolean|null>(null);
  const viewFlipped=boardFlipped ?? me?.team==='b';
  const [choosingFriend,setChoosingFriend]=useState(false),[selectedFriend,setSelectedFriend]=useState<Player|null>(null);
  const [choosingTeammates,setChoosingTeammates]=useState(false);
  const [teammateError,setTeammateError]=useState("");
  const [teammates,setTeammates]=useState<Player[]>([]);
  const promptedRoom=useRef<string | undefined>(undefined);
  const bughouse=(room?.variant ?? variant)==="bughouse";
  const supportsTeammates=(room?.mode ?? mode)==="team" || bughouse;
  const inviteFriendsLabel=bughouse ? "Invite a Friend" : "Invite friends";
  const teammateSlots=room && me?.team ? Math.max(0,(bughouse ? 2 : 6)-room.members.filter(member=>
    bughouse && (member.board ?? 0)!==(me.board ?? 0) ? !!member.team && member.team!==me.team : member.team===me.team
  ).length) : bughouse ? 1 : 5;
  const canInviteTeammates=!!room && supportsTeammates && !!me?.team && ["waiting","playing"].includes(room.status) && teammateSlots>0;
  useEffect(()=>{
    if(promptForTeammates && canInviteTeammates && room && promptedRoom.current!==room.id){
      promptedRoom.current=room.id;
      setChoosingTeammates(true);
    }
  },[canInviteTeammates,promptForTeammates,room?.id]);
  async function chooseTeammates(players:Player[]) {
    setTeammateError("");
    if(!room){setTeammates(players);setChoosingTeammates(false);return;}
    setBusy(true);
    setError("");
    try {
      await onlineAction({action:"invite_teammates",room:room.id,friends:players.map(player=>player.id)});
      setChoosingTeammates(false);
      notify("Team invitations sent.");
    } catch(e) { setTeammateError((e as Error).message); }
    finally {setBusy(false);}
  }
  async function challengeFriend(friend:string) {
    setBusy(true); setError("");
    try {
      const result = await onlineAction({action:"create", mode, name, variant, timeControlSeconds, incrementSeconds, bot:false,friend,...(supportsTeammates && teammates.length ? {teammates:teammates.map(player=>player.id)} : {})});
      notify("Game invitation sent.");setChoosingFriend(false);
      navigate(mode === "standard" && variant === "chess" ? "play" : "variants", "online/" + result.id);
    } catch (e) { setError((e as Error).message);notify((e as Error).message); }
    finally { setBusy(false); }
  }
  const canCancelFriendRequest = room?.status === "waiting" && room.host === uid &&
    !!room.settings.invitedFriend && !room.members.some(member => member.id === room.settings.invitedFriend);
  const selectedDescription = mode === "throne" ? "Winner stays. Queue to challenge."
    : mode === "vote" ? "One day per move. Earliest vote breaks a tie."
    : mode === "team" ? "Invite friends to your side. Share moves and arrows."
    : variant === "speedrun" ? "Beat the computer as fast as possible"
    : variantList.find(v => v.id === variant)?.description;
  const supportsFriendGame = mode !== "throne" && mode !== "vote" && variant !== "speedrun";
  const friendSettings = !room && supportsFriendGame ? <div className={`friend-game-settings${supportsTeammates ? " team-friend-settings" : ""}`}>{selectedFriend ? <div className="friend-selection-field"><input aria-label="Selected friend" readOnly value={screenName(selectedFriend)}/><button type="button" aria-label="Remove selected friend" disabled={busy} onClick={()=>setSelectedFriend(null)}><X size={14}/></button></div> : <Button className="secondary invite-friends-option" disabled={busy || !online || !uid || (mode==="team" && bot)} onClick={()=>setChoosingFriend(true)}><Users size={16}/>Play a Friend</Button>}{supportsTeammates && <Button className="secondary" disabled={busy || !online || !uid} onClick={()=>setChoosingTeammates(true)}><Users size={16}/>{inviteFriendsLabel}{teammates.length ? ` (${teammates.length})` : ""}</Button>}</div> : null;
  return (
    <>
      {friendSettingsHost ? createPortal(friendSettings,friendSettingsHost) : friendSettings}
      {choosingTeammates && <FriendPicker busy={busy} submitError={teammateError} onClose={()=>{setChoosingTeammates(false);setTeammateError("");}}
        teammates={{initial:room ? [] : teammates, excluded:room ? [...room.members.map(member=>member.id),room.settings.invitedFriend ?? ""] : [selectedFriend?.id ?? ""],
          limit:teammateSlots, allowEmpty:!room, action:room ? (bughouse ? "Send invitation" : "Send invitations") : (bughouse ? "Save teammate" : "Save teammates"),onConfirm:players=>void chooseTeammates(players)}} />}
      {choosingFriend && <FriendPicker onClose={()=>setChoosingFriend(false)} onChoose={player=>{setSelectedFriend(player);setTeammates(list=>list.filter(friend=>friend.id!==player.id));setChoosingFriend(false);}} busy={busy}/>}
      {!room && tab === "community" && <PageTitle title="Play" />}
      {room && <div className="online-game-heading"><div className="online-game-title">{['throne','vote','team'].includes(room.mode)?<MultiplayerPicture mode={room.mode}/> : room.variant==='speedrun'?<img className="speedrun-picture" src={`${base}variants/speedrun.webp`} alt=""/>:<VariantIcon id={room.variant} size={68}/>}<h1>{variantTitle}</h1></div></div>}
      {!online || !uid ? (
        <>
          <Card className="quick-online-play"><Button className="new-game-primary" disabled>{mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Start"}</Button>{selectedDescription && <p className="caption">{selectedDescription}</p>}</Card>
          {children}
          {children ? (online ? <Button className="secondary variant-sign-in" onClick={() => navigate("signin")}>Sign in to play online</Button> : <p className="caption variant-sign-in">Online play is unavailable.</p>) : <OnlineAccount />}
        </>
      ) : (
        <>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {room?.status === "cancelled" ? (
            <Card>
              <p>This game was canceled.</p>
              <Button onClick={() => navigate("play")}>Back to Play</Button>
            </Card>
          ) : room ? (
            <div className="chess-layout online-match">
              {canCancelFriendRequest && (
                <Button className="cancel-friend-request secondary" disabled={busy} onClick={() => void act("cancel_friend_request")}>
                  <X size={20} /> Cancel request
                </Button>
              )}

              <div className="board-column">
                {playerStrip(viewFlipped ? "w" : "b", "top")}
                {room.variant === "blindtext" ? <form onSubmit={e=>{e.preventDefault();if(!ff || !position || (!canMove && !appearance.premoves))return;const b=new ff.Board("chess",canMove?position.fen:premove.preview);try{const move=matchTypedMove(typed,(canMove?legal:premove.options).map(m=>{let san=m;try{san=b.sanMove(m);}catch{}return {uci:m,san};}));if(move){if(canMove)void submitMove(move).then(()=>setTyped("")).catch(()=>{});else{premove.enqueue(move);setTyped("");}}}finally{b.delete();}}}><Field label="Blindfold move"><input value={typed} onChange={e=>setTyped(e.target.value)} autoComplete="off" disabled={room.status!=="playing" || room.state.result!=="*" || !me?.team || (!canMove && !appearance.premoves)}/></Field><Button disabled={room.status!=="playing" || room.state.result!=="*" || !me?.team || (!canMove && !appearance.premoves)}>{canMove?"Move":"Queue premove"}</Button></form> : <Board
                  fen={duck?.fen || premove.preview}
                  hidden={room.variant === "blind"}
                  visible={room.variant === "cvfog" ? fog(position!.fen,me?.team || "w") : undefined}
                  highlights={[]}
                  overlay={showLast && last ? <div className="throne-round-result"><GameResult result={last.result} human={uid===last.white?"w":"b"} onReview={() => reviewGame(true)}/><p>{last.resignedBy?`${last.resignedBy===uid?"You":username(last.resignedBy)} ${last.reason==="left"?"left the game":"resigned"}.`:last.reason==="draw"?"Draw":"Checkmate"}</p><Button onClick={dismissResult}>Continue</Button></div> : <GameResult result={room.variant === "bughouse" && me?.board === 1 && ["1-0","0-1"].includes(room.state.result) ? (room.state.result === "1-0" ? "0-1" : "1-0") : room.state.result} human={me?.team} onReview={() => reviewGame()}/>}
                  overlayId={showLast && last ? last.id : room.id + room.state.result}
                  onDismissOverlay={showLast ? dismissResult : undefined}
                  materialFen={position?.fen}
                  onCancelPremoves={premove.cancelOnRightClick}
                  flipped={viewFlipped} onFlip={()=>setBoardFlipped(!viewFlipped)}
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
                {playerStrip(viewFlipped ? "b" : "w", "bottom")}
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
                </div>
              </div>
              <div className="side-panels">
              <aside className="online-match-actions" aria-label="Game actions">
                  {me?.team && room.mode !== "vote" && (
                    <Button
                      className="draw-button"
                      disabled={busy || room.status !== "playing" || room.state.result !== "*" || room.state.drawOffer === me.team}
                      onClick={() => void act("draw")}
                    >
                      <Handshake size={16} />
                      {room.state.drawOffer === me.team ? "Draw offered" : room.state.drawOffer ? "Accept draw" : "Offer draw"}
                    </Button>
                  )}
                  {me?.team && room.state.drawOffer && room.state.drawOffer !== me.team && <Button className="secondary" disabled={busy} onClick={() => void act("decline_draw")}>Decline draw</Button>}
                  {me?.team && room.mode !== "vote" && (
                    <Button
                      className="resign-button"
                      disabled={busy || room.state.result !== "*"}
                      onClick={() => void act(canLeave ? "leave" : "resign")}
                    >
                      <Flag size={16} />
                      {canLeave ? "Leave" : "Resign"}
                    </Button>
                  )}

              </aside>
                {room.mode==='throne' && <RoomChat roomId={room.id} uid={uid!} nameFor={username} loadProfiles={loadProfiles}/>}
                <Card>
                  <h2>
                    {room.status === "waiting"
                      ? "Waiting for players"
                      : room.state.result !== "*"
                        ? "Game finished"
                        : room.mode === "vote" ? "Voting open" : "Playing"}
                  </h2>
                  {room.mode !== "standard" && <div className="team-rosters">
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
                  </div>}
                  {canInviteTeammates && <Button className="secondary" disabled={busy} onClick={()=>setChoosingTeammates(true)}>
                    <Users size={16}/>{inviteFriendsLabel}
                  </Button>}
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
                  <h2>Moves</h2>
                  <table className="online-notation" aria-label="Game notation">
                    <thead><tr><th scope="col">Move</th><th scope="col">White</th><th scope="col">Black</th></tr></thead>
                    <tbody>{Array.from({length:Math.ceil(((position?.notation.length || 0) + (position?.initial?.split(" ")[1] === "b" ? 1 : 0))/2)},(_,row) => {
                      const offset = position?.initial?.split(" ")[1] === "b" ? 1 : 0;
                      const first = Number(position?.initial?.split(" ")[5]) || 1;
                      return <tr key={row}><th scope="row">{first + row}.</th><td>{position?.notation[row*2-offset] || ""}</td><td>{position?.notation[row*2+1-offset] || ""}</td></tr>;
                    })}</tbody>
                  </table>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="quick-online-play">
              {mode === "team" && <Field label="Opponent"><ChoiceSelect value={bot?"bot":"friends"} onChange={e=>{setBot(e.target.value==="bot");if(e.target.value==="bot")setSelectedFriend(null);}}><option value="friends">Another team</option><option value="bot">Computer</option></ChoiceSelect></Field>}
              {mode === "team" && bot && <div className="team-computer-rating"><Field label="Computer rating">
                <input className="team-rating-input" type="number" min={teamComputerMinRating} max={teamComputerMaxRating} step={teamComputerRatingStep}
                  value={botRating} onChange={e=>setBotRating(e.target.value)}
                  onBlur={()=>setBotRating(String(clampTeamComputerRating(botRating === "" ? undefined : Number(botRating))))}/>
              </Field>
                <Button className="secondary" aria-pressed={Number(botRating) === teamComputerMaxRating}
                  onClick={() => setBotRating(String(teamComputerMaxRating))}>Max strength</Button>
              </div>}
              <Button className="new-game-primary" disabled={busy} onClick={async()=>{
                if(selectedFriend){await challengeFriend(selectedFriend.id);return;}
                setBusy(true);setError("");
                try {
                  if(mode==="vote"){
                    await act("create",{mode});
                    return;
                  }
                  if(mode==="team" && bot){
                    await act("create",{mode,name,variant:"chess",bot:true,
                      botRating:clampTeamComputerRating(botRating === "" ? undefined : Number(botRating)),
                      ...(teammates.length ? {teammates:teammates.map(player=>player.id)} : {})});
                    return;
                  }
                  const listing=online!.from("room_lobby").select("id,name,mode,variant,status,member_count,updated_at,time_control,increment_seconds").eq("mode",mode).eq("variant",variant).order("status",{ascending:true}).order("updated_at",{ascending:true}).limit(40);
                  if(mode==="standard")listing.eq("status","waiting").lt("member_count",variant==="bughouse"?4:2);
                  if(mode==="standard" && variant==="chess")listing.eq("time_control",timeControlSeconds).eq("increment_seconds",incrementSeconds);
                  const {data,error}=await listing;
                  if(error)throw error;
                  const available=(data||[]).filter(r=>mode!=="standard" || variant!=="chess" || (r.time_control===timeControlSeconds && r.increment_seconds===incrementSeconds)).find(r=>mode === "throne" || (mode === "standard" && r.status === "waiting" && r.member_count < (variant === "bughouse" ? 4 : 2)));
                  if(available && !teammates.length) await act("join",{room:available.id});
                  else await act("create",{mode,name,timeControlSeconds,incrementSeconds,variant,bot:false,...(supportsTeammates && teammates.length ? {teammates:teammates.map(player=>player.id)} : {})});
                }catch(e){setError((e as Error).message);}finally{setBusy(false);}
              }}>{busy ? "Connecting…" : mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Start"}</Button>

              {selectedDescription && <p className="caption">{selectedDescription}</p>}
            </Card>
          )}
          {!room && children}
        </>
      )}
    </>
  );
}
