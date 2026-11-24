import {useState} from 'react';
import {UserPlus,Check,X,UserMinus,Play} from 'lucide-react';
import {useApp} from '../lib/context';
import {online,onlineAction,useOnlineSession} from '../lib/online';
import {usePlayers,type Player} from '../lib/players';
import {screenName} from '../lib/screenName';
import {Card,Button} from '../components/UI';
export default function Players(){
 const {session}=useOnlineSession(),{navigate,notify}=useApp();
 const [section,setSection]=useState('friends'),[query,setQuery]=useState(''),[page,setPage]=useState(0),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const searchReady=section!=='everyone'||query.trim().length>=2;
 const list=usePlayers(query.trim(),section,page,!!session&&searchReady),requests=usePlayers('','requests',0,!!session);
 async function action(player:Player,act:string){setBusy(player.id);setError('');try{const {error}=await online!.rpc('friend_action',{p_player:player.id,p_action:act});if(error)throw error;list.refresh();requests.refresh();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function challenge(player:Player){
  setBusy(player.id);
  setError('');
  try{
   const game=await onlineAction({
    action:'create',mode:'standard',variant:'chess',friend:player.id,timeControlSeconds:180,
   });
   notify(`Game invitation sent to ${screenName(player)}.`);
   navigate('play','online/'+game.id);
  }catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 function row(player:Player) {
  const name = screenName(player);
  const NameHeading = section === 'friends' && player.relationship === 'friends' ? 'h4' : 'h3';
  return <article className="player-card" key={player.id}>
    <div className="player-identity">
      <div className="player-initial">
        <span aria-hidden="true">{Array.from(name)[0]?.toLocaleUpperCase()}</span>
        <span className={`account-status-dot ${player.online ? 'online' : 'offline'}`}
          role="img" aria-label={player.online ? 'Online' : 'Offline'} />
      </div>
      <div className="player-name-and-rating">
        <NameHeading>{name}</NameHeading>
        <p className="caption">{player.rating} Elo{player.country ? ` · ${player.country}` : ''}</p>
      </div>
    </div>
    <div className="button-row player-actions">
      {player.relationship==='incoming'?<><Button disabled={!!busy} onClick={()=>void action(player,'accept')}><Check size={16}/>Accept</Button><Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}><X size={16}/>Decline</Button></>:player.relationship==='friends'?<Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}><UserMinus size={16}/>Remove friend</Button>:player.relationship==='outgoing'?<Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'remove')}>Cancel request</Button>:<Button className="secondary" disabled={!!busy} onClick={()=>void action(player,'send')}><UserPlus size={16}/>Add friend</Button>}
      <Button disabled={!!busy} onClick={()=>void challenge(player)}><Play size={16}/>Play</Button>
    </div>
  </article>;
 }
 return <div className="players-page">
 {!online||!session?<Card><p>Sign in to find players and manage your friends.</p><Button className="sign-in-action" onClick={()=>navigate('signin')}>Sign in</Button></Card>:<>
 <div className="players-search-controls"><div className="segmented page-segments" role="group" aria-label="Player sections">{[['friends','Friends'],['everyone','Everyone']].map(([id,label])=><button key={id} className={section===id?'active':''} aria-pressed={section===id} onClick={()=>{setSection(id);setPage(0);}}>{label}</button>)}</div>
 <input className="players-search-input" aria-label="Search players" type="search" value={query} maxLength={100} placeholder="Search by name" onChange={e=>{setQuery(e.target.value);setPage(0);}}/></div>
 <div className="players-results">
 {error&&<p role="alert">{error}</p>}
 {section==='friends'&&requests.players.length>0&&<section className="player-directory-section friend-requests"><h2>Friend requests</h2><div className="player-grid">{requests.players.map(row)}</div></section>}
 {searchReady&&list.error&&<p role="alert">{list.error}</p>}{requests.error&&section==='friends'&&<p role="alert">{requests.error}</p>}
 {searchReady&&<h2 className="players-results-heading">{section==='friends'?'Your friends':'Everyone'}</h2>}
 {!searchReady?null:list.loading?<p role="status">Loading players…</p>:list.players.length?section==='friends'?([true,false] as const).map(isOnline=>{
  const label=isOnline?'Online':'Offline';
  const friends=list.players.filter(player=>player.online===isOnline);
  return <section className={`player-directory-section player-presence-group ${isOnline ? "is-online" : "is-offline"}`} key={label} aria-label={label}><h3>{label}</h3>{friends.length?<div className="player-grid">{friends.map(row)}</div>:<p className="caption">No {label.toLowerCase()} friends{query.trim()?' match your search':''}.</p>}</section>;
 }):<div className="player-directory-section player-grid">{list.players.map(row)}</div>:<Card><p>{query?'No players match your search.':section==='friends'?'No friends yet. Find someone in Everyone to send a request.':'No players found.'}</p></Card>}
 {section==='everyone'&&searchReady&&<div className="button-row players-pagination"><Button className="secondary" disabled={page===0||list.loading} onClick={()=>setPage(n=>n-1)}>Previous</Button><span>Page {page+1}</span><Button className="secondary" disabled={list.players.length<50||list.loading} onClick={()=>setPage(n=>n+1)}>Next</Button></div>}
 </div>
 </>}
 </div>;
}
