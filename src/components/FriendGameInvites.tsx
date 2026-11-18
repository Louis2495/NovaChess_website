import {useEffect,useState} from 'react';
import {online,onlineAction} from '../lib/online';
import {screenName} from '../lib/screenName';
import {useApp} from '../lib/context';
import {Button} from './UI';
type Invite={id:string;room_id:string;username?:string;screen_name?:string;variant:string;name:string;time_control:number};
export default function FriendGameInvites({userId}:{userId?:string}){
 const [invites,setInvites]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');const {navigate}=useApp();
 useEffect(()=>{setInvites([]);setError('');if(!online||!userId)return;let active=true;const load=async()=>{try{const {data,error}=await online!.rpc('friend_game_invitations');if(active&&!error)setInvites(Array.isArray(data)?data:[]);}catch{}};void load();const timer=window.setInterval(()=>void load(),15000);window.addEventListener('focus',load);return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',load);};},[userId]);
 if(!invites.length)return null;const invite=invites[0];
 async function respond(accept:boolean){setBusy(true);setError('');try{let room;if(accept)room=await onlineAction({action:'join',room:invite.room_id});const {error}=await online!.rpc('respond_friend_game',{p_invite:invite.id,p_accept:accept});if(error)throw error;setInvites(rows=>rows.filter(row=>row.id!==invite.id));if(room)navigate(room.mode==='standard'&&room.variant==='chess'?'play':'variants','online/'+room.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <aside className="friend-game-invite" aria-label="Game invitation"><strong>{screenName(invite)} invited you to play</strong><p>{invite.name}{invite.time_control?` · ${invite.time_control/60} min`:''}</p>{error&&<p role="alert">{error}</p>}<div className="button-row"><Button disabled={busy} onClick={()=>void respond(true)}>Accept game</Button><Button className="secondary" disabled={busy} onClick={()=>void respond(false)}>Decline</Button></div></aside>;
}
