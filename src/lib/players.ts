import {useCallback,useEffect,useState} from 'react';
import {online} from './online';
export type Player={id:string;username?:string;screen_name?:string;country:string;rating:number;online:boolean;relationship:'none'|'friends'|'incoming'|'outgoing'};
export function usePlayers(query:string,section:string,page=0,enabled=true){
 const [players,setPlayers]=useState<Player[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(n=>n+1),[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');if(!enabled){setPlayers([]);setLoading(false);return;}
  const load=async()=>{if(!online){if(active)setLoading(false);return;}try{const {data,error}=await online.rpc('player_directory',{p_query:query,p_section:section,p_page:page});if(!active)return;if(error)throw error;setPlayers(Array.isArray(data)?data:[]);}catch(e){if(active)setError((e as Error).message);}finally{if(active)setLoading(false);}};
  const delay=window.setTimeout(()=>void load(),200),timer=window.setInterval(()=>void load(),15000);
  return()=>{active=false;window.clearTimeout(delay);window.clearInterval(timer);};
 },[query,section,page,version,enabled]);
 return {players,loading,error,refresh};
}
