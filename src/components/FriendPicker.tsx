import {useState} from 'react';
import {usePlayers} from '../lib/players';
import {screenName} from '../lib/screenName';
import {useApp} from '../lib/context';
import {Modal,Button,Field} from './UI';
export default function FriendPicker({onClose,onChoose,busy}:{onClose:()=>void;onChoose:(id:string)=>Promise<void>;busy:boolean}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);const {players,loading,error}=usePlayers(query,'friends',page),{navigate}=useApp();
 return <Modal title="Play a Friend" onClose={onClose}><Field label="Search friends"><input type="search" maxLength={100} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></Field>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading friends…</p>:players.length?<div className="friend-picker-list">{players.map(player=><Button key={player.id} className="secondary" disabled={busy} onClick={()=>void onChoose(player.id)}><span className={`account-status-dot ${player.online?'online':'offline'}`}/><span>{screenName(player)}</span><small>{player.rating} Elo</small></Button>)}</div>:<p>{query?'No friends match your search.':'Your friends will appear here after they accept your request.'}</p>}<div className="button-row"><Button className="secondary" disabled={page===0||busy} onClick={()=>setPage(n=>n-1)}>Previous</Button><Button className="secondary" disabled={players.length<50||busy} onClick={()=>setPage(n=>n+1)}>Next</Button><Button onClick={()=>navigate('players')}>Find players</Button></div></Modal>;
}
