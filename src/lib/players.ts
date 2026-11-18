import {useCallback,useEffect,useState} from 'react';
import {online} from './online';
export type Player={id:string;username?:string;screen_name?:string;country:string;rating:number;online:boolean;relationship:'none'|'friends'|'incoming'|'outgoing'};
export function usePlayers(query:string,section:string,page=0,enabled=true){
 const [players,setPlayers]=useState<Player[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(n=>n+1),[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');if(!enabled){setPlayers([]);setLoading(false);return;}
  let inFlight=false;
  const load=async()=>{
   if(!online){if(active)setLoading(false);return;}
   if(inFlight)return;inFlight=true;
   try{
    const collected=new Map<string,Player>();let cursor=section==='everyone'?page:0;
    while(active){
     const {data,error}=await online.rpc('player_directory',{p_query:query,p_section:section,p_page:cursor});
     if(!active)return;if(error)throw error;
     const rows:Player[]=Array.isArray(data)?data:[],before=collected.size;
     rows.forEach(player=>collected.set(player.id,player));
     if(section==='everyone'||rows.length<50||collected.size===before)break;
     cursor++;
    }
    if(active)setPlayers([...collected.values()]);
   }catch(e){if(active)setError((e as Error).message);}finally{inFlight=false;if(active)setLoading(false);}
  };
  const delay=window.setTimeout(()=>void load(),200),timer=window.setInterval(()=>void load(),15000);
  return()=>{active=false;window.clearTimeout(delay);window.clearInterval(timer);};
 },[query,section,page,version,enabled]);
 return {players,loading,error,refresh};
}
