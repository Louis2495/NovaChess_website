import {useLayoutEffect,useRef,useState} from 'react';
import {UserPlus,Check,X,UserMinus} from 'lucide-react';
import {useApp} from '../lib/context';
import {online,useOnlineSession} from '../lib/online';
import {usePlayers,type Player} from '../lib/players';
import {screenName} from '../lib/screenName';
import {Card,Button} from '../components/UI';
export default function Players(){
 const {session}=useOnlineSession(),{navigate}=useApp();
 const [section,setSection]=useState('friends'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const pageRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const el=pageRef.current;if(!el)return;
  const center=()=>{const rect=el.getBoundingClientRect();el.style.setProperty('--players-center-offset',`${document.documentElement.clientWidth/2-rect.left-rect.width/2}px`);};
  const observer=new ResizeObserver(center);observer.observe(el);window.addEventListener('resize',center);center();
  return()=>{observer.disconnect();window.removeEventListener('resize',center);};
 },[]);
 const searchReady=section!=='everyone'||query.trim().length>=3;
 const list=usePlayers(query.trim(),section,page,!!session&&searchReady),requests=usePlayers('','requests',0,!!session);
 async function action(player:Player,act:string){setBusy(player.id);setError('');try{const {error}=await online!.rpc('friend_action',{p_player:player.id,p_action:act});if(error)throw error;list.refresh();requests.refresh();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 function row(player:Player){return <Card className="player-card" key={player.id}><div className="player-identity"><span className={`account-status-dot ${player.online?'online':'offline'}`} role="img" aria-label={player.online?'Online':'Offline'}/><div><h3>{screenName(player)}</h3><p className="caption">{player.rating} Elo{player.country?` · ${player.country}`:''}</p></div></div><div className="button-row">
 {player.relationship==='incoming'?<><Button disabled={!!busy} onClick={()=>void action(player,'accept')}><Check size={16}/>Accept</Button><Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}><X size={16}/>Decline</Button></>:player.relationship==='friends'?<Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}><UserMinus size={16}/>Remove friend</Button>:player.relationship==='outgoing'?<Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}>Cancel request</Button>:<Button disabled={!!busy} onClick={()=>void action(player,'send')}><UserPlus size={16}/>Add friend</Button>}
 </div></Card>;}
 return <div className="players-page" ref={pageRef}>
 {!online||!session?<Card><p>Sign in to find players and manage your friends.</p><Button onClick={()=>navigate('signin')}>Sign in</Button></Card>:<>
 <div className="players-search-controls"><div className="segmented page-segments" role="group" aria-label="Player sections">{[['friends','Friends'],['everyone','Everyone']].map(([id,label])=><button key={id} className={section===id?'active':''} aria-pressed={section===id} onClick={()=>{setSection(id);setPage(0);}}>{label}</button>)}</div>
 <input className="players-search-input" aria-label="Search players" type="search" value={query} maxLength={100} placeholder="Search by name" onChange={e=>{setQuery(e.target.value);setPage(0);}}/></div>
 {error&&<p role="alert">{error}</p>}
 {section==='friends'&&requests.players.length>0&&<section><h2>Friend requests</h2><div className="player-grid">{requests.players.map(row)}</div></section>}
 {searchReady&&list.error&&<p role="alert">{list.error}</p>}{requests.error&&section==='friends'&&<p role="alert">{requests.error}</p>}
 {searchReady&&<h2 className="players-results-heading">{section==='friends'?'Your friends':'Everyone'}</h2>}
 {!searchReady?null:list.loading?<p role="status">Loading players…</p>:list.players.length?<div className="player-grid">{list.players.map(row)}</div>:<Card><p>{query?'No players match your search.':section==='friends'?'No friends yet. Find someone in Everyone to send a request.':'No players found.'}</p></Card>}
 {section==='everyone'&&searchReady&&<div className="button-row players-pagination"><Button className="secondary" disabled={page===0||list.loading} onClick={()=>setPage(n=>n-1)}>Previous</Button><span>Page {page+1}</span><Button className="secondary" disabled={list.players.length<50||list.loading} onClick={()=>setPage(n=>n+1)}>Next</Button></div>}
 </>}
 </div>;
}
