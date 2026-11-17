import {useEffect,useRef,useState} from 'react';
import {online,useSiteAdmin} from '../lib/online';
import {Button,Card,IconButton} from './UI';
import {Trash2,Send} from 'lucide-react';
type Message={id:number;room_id:string;user_id:string;body:string;created_at:string};
export default function RoomChat({roomId,uid,nameFor,loadProfiles}:{roomId:string;uid:string;nameFor:(id:string)=>string;loadProfiles:(ids:string[])=>Promise<void>}){
 const [messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const {isAdmin}=useSiteAdmin(),list=useRef<HTMLDivElement>(null),stick=useRef(true),deleted=useRef(new Set<number>());
 useEffect(()=>{if(!online)return;let active=true;stick.current=true;deleted.current.clear();setMessages([]);setError('');
  const merge=(next:Message[])=>{if(!active)return;setMessages(current=>[...new Map([...current,...next].filter(m=>!deleted.current.has(m.id)).map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id).slice(-60));void loadProfiles(next.map(m=>m.user_id));};
  const load=async()=>{const {data,error}=await online!.from('room_messages').select('id,room_id,user_id,body,created_at').eq('room_id',roomId).order('id',{ascending:false}).limit(60);if(!active)return;if(error)setError(error.message);else merge(data||[]);};
  void load();const channel=online.channel('room-chat-'+roomId).on('postgres_changes',{event:'INSERT',schema:'public',table:'room_messages',filter:`room_id=eq.${roomId}`},payload=>merge([payload.new as Message])).on('postgres_changes',{event:'DELETE',schema:'public',table:'room_messages'},payload=>{if(active){deleted.current.add(payload.old.id as number);setMessages(ms=>ms.filter(m=>m.id!==payload.old.id));}}).subscribe(status=>{if(status==='SUBSCRIBED')void load();});
  return()=>{active=false;void online!.removeChannel(channel);};
 },[roomId,loadProfiles]);
 useEffect(()=>{if(stick.current && list.current)list.current.scrollTop=list.current.scrollHeight;},[messages]);
 return <Card className="room-chat"><h2>Chat</h2><div className="room-chat-messages" ref={list} role="log" aria-label="Game chat" aria-live="polite" onScroll={()=>{const el=list.current;if(el)stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<45;}}>{messages.map(m=><div className="room-chat-message" key={m.id}><b>{nameFor(m.user_id)}</b><p>{m.body}</p>{(m.user_id===uid || isAdmin) && <IconButton label="Delete chat message" onClick={async()=>{const {error}=await online!.from('room_messages').delete().eq('id',m.id);if(error)setError(error.message);else {deleted.current.add(m.id);setMessages(ms=>ms.filter(row=>row.id!==m.id));}}}><Trash2 size={13}/></IconButton>}</div>)}</div>
 {error && <p role="alert" className="auth-error">{error}</p>}
 <form onSubmit={async e=>{e.preventDefault();if(!text.trim() || busy)return;setBusy(true);setError('');const body=text.trim();try{const {data,error}=await online!.rpc('post_room_message',{p_room:roomId,p_body:body});if(error)throw error;setMessages(ms=>[...new Map([...ms,data as Message].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id).slice(-60));setText('');stick.current=true;}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><input aria-label="Game chat message" value={text} maxLength={600} autoComplete="off" onChange={e=>setText(e.target.value)} placeholder="Message"/><Button disabled={busy || !text.trim()} aria-label="Send chat message"><Send size={17}/></Button></form></Card>;
}
