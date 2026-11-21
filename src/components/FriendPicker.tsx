import {useState} from 'react';
import {usePlayers,type Player} from '../lib/players';
import {screenName} from '../lib/screenName';
import {useApp} from '../lib/context';
import {Modal,Button,Field} from './UI';

type PickerProps = {onClose:()=>void;busy:boolean;submitError?:string} & (
  {onChoose:(player:Player)=>void; teammates?:never} |
  {onChoose?:never; teammates:{initial:Player[]; excluded:string[]; limit:number; onConfirm:(players:Player[])=>void; action:string;allowEmpty?:boolean}}
);

export default function FriendPicker({onClose,onChoose,busy,submitError,teammates}:PickerProps){
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(teammates?.initial ?? []);
  const {players,loading,error}=usePlayers(query,'friends');
  const {navigate}=useApp();
  const available=players.filter(player=>!teammates?.excluded.includes(player.id));
  return <Modal title={teammates ? "Invite friends to your team" : "Play a Friend"} onClose={onClose}>
    {teammates && <p className="caption">{selected.length} of {teammates.limit} selected</p>}
    <Field label="Search friends"><input type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)}/></Field>
    {(submitError || error) && <p role="alert">{submitError || error}</p>}
    {loading ? <p role="status">Loading friends…</p> : available.length ? (
      <div className="friend-picker-list">
        {available.map(player=>{
          const picked=selected.some(friend=>friend.id===player.id);
          return <Button key={player.id} className={picked ? undefined : "secondary"} aria-pressed={teammates ? picked : undefined}
            disabled={busy || (!!teammates && !picked && selected.length>=teammates.limit)}
            onClick={()=>onChoose ? onChoose(player) : setSelected(list=>picked ? list.filter(friend=>friend.id!==player.id) : [...list,player])}>
            <span className={`account-status-dot ${player.online?'online':'offline'}`}/>
            <span>{screenName(player)}</span><small>{player.rating} Elo</small>
          </Button>;
        })}
      </div>
    ) : <p>{query ? "No friends match your search." : teammates ? "No eligible friends to invite." : "Your friends will appear here after they accept your request."}</p>}
    <div className="button-row">
      {teammates ? <Button disabled={busy || (!teammates.allowEmpty && !selected.length)} onClick={()=>teammates.onConfirm(selected)}>{teammates.action}</Button>
        : <Button onClick={()=>navigate('players')}>Find players</Button>}
    </div>
  </Modal>;
}
