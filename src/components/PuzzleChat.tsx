import {useEffect,useRef,useState} from 'react';
import {Send,Trash2} from 'lucide-react';
import {online,useOnlineSession,useSiteAdmin} from '../lib/online';
import {useApp} from '../lib/context';
import {screenName} from '../lib/screenName';
import {Button,Card,IconButton} from './UI';
type Message={id:number;puzzle_key:string;user_id:string;body:string;created_at:string};
type Profile={id:string;username?:string;screen_name?:string};
export default function PuzzleChat({puzzleKey}:{puzzleKey:string}){
 const {session}=useOnlineSession(),{isAdmin}=useSiteAdmin(),{navigate,library}=useApp();
 const [messages,setMessages]=useState<Message[]>([]),[profiles,setProfiles]=useState<Record<string,Profile>>({}),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const list=useRef<HTMLDivElement>(null),stick=useRef(true),known=useRef(new Set<string>()),deleted=useRef(new Set<number>());
 const uid=session?.user.id;
 useEffect(()=>{
  setMessages([]);setText('');setError('');known.current.clear();deleted.current.clear();setProfiles({});stick.current=true;
  if(!online || !uid)return;let active=true;
  const merge=(rows:Message[])=>{
   if(!active)return;
   const scoped=rows.filter(m=>m.puzzle_key===puzzleKey && !deleted.current.has(m.id));
   setMessages(current=>[...new Map([...current,...scoped].filter(m=>!deleted.current.has(m.id)).map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id).slice(-60));
   const missing=[...new Set(scoped.map(m=>m.user_id))].filter(id=>!known.current.has(id));
   if(missing.length){missing.forEach(id=>known.current.add(id));void online!.from('profiles').select('id,username,screen_name').in('id',missing).then(({data,error})=>{if(!active)return;if(error)missing.forEach(id=>known.current.delete(id));else setProfiles(current=>({...current,...Object.fromEntries((data||[]).map(p=>[p.id,p]))}));});}
  };
  const load=async()=>{const {data,error}=await online!.from('puzzle_messages').select('id,puzzle_key,user_id,body,created_at').eq('puzzle_key',puzzleKey).order('id',{ascending:false}).limit(60);if(!active)return;if(error)setError(error.message);else merge(data||[]);};
  void load();const channel=online.channel('puzzle-chat-'+puzzleKey).on('postgres_changes',{event:'INSERT',schema:'public',table:'puzzle_messages',filter:`puzzle_key=eq.${puzzleKey}`},payload=>merge([payload.new as Message])).on('postgres_changes',{event:'DELETE',schema:'public',table:'puzzle_messages'},payload=>{if(active){deleted.current.add(payload.old.id as number);setMessages(ms=>ms.filter(m=>m.id!==payload.old.id));}}).subscribe(status=>{if(status==='SUBSCRIBED')void load();});
  return()=>{active=false;void online!.removeChannel(channel);};
 },[uid,puzzleKey]);
 useEffect(()=>{if(stick.current && list.current)list.current.scrollTop=list.current.scrollHeight;},[messages]);
 return <Card className="room-chat puzzle-chat"><h2>Daily puzzle chat</h2><p className="caption">Chat with everyone solving this puzzle.</p>
 <div className="room-chat-messages" ref={list} role="log" aria-label="Daily puzzle chat" aria-live="polite" onScroll={()=>{const el=list.current;if(el)stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<45;}}>
 {messages.map(m=><div className="room-chat-message" key={m.id}><b>{screenName(m.user_id===uid?library.profile:profiles[m.user_id])}</b><p>{m.body}</p>{(m.user_id===uid || isAdmin) && <IconButton label="Delete puzzle message" onClick={async()=>{const {error}=await online!.from('puzzle_messages').delete().eq('id',m.id);if(error)setError(error.message);else{deleted.current.add(m.id);setMessages(ms=>ms.filter(row=>row.id!==m.id));}}}><Trash2 size={13}/></IconButton>}</div>)}
 </div>{error && <p role="alert" className="auth-error">{error}</p>}
 {!online?<p className="caption">Puzzle chat is not connected yet.</p>:!uid?<Button onClick={()=>navigate('signin')}>Sign in to chat</Button>:<form onSubmit={async e=>{e.preventDefault();if(!text.trim() || busy)return;setBusy(true);setError('');try{const {data,error}=await online!.rpc('post_puzzle_message',{p_puzzle:puzzleKey,p_body:text.trim()});if(error)throw error;const message=data as Message;setMessages(ms=>[...new Map([...ms,message].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id).slice(-60));setText('');stick.current=true;}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><input aria-label="Puzzle chat message" value={text} maxLength={600} autoComplete="off" onChange={e=>setText(e.target.value)} placeholder="Message"/><Button disabled={busy || !text.trim()} aria-label="Send puzzle message"><Send size={17}/></Button></form>}
 </Card>;
}
