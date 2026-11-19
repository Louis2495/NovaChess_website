import type {ResearchGame} from './researchGames';
export function researchParser(signal:AbortSignal){
 const worker=new Worker(new URL('./researchParser.worker.ts',import.meta.url),{type:'module'});
 let next=0,stopped:Error|undefined;const pending=new Map<number,{resolve:(games:ResearchGame[])=>void;reject:(error:Error)=>void}>();
 const stop=(error:Error)=>{stopped=error;worker.terminate();for(const task of pending.values())task.reject(error);pending.clear();};
 const abort=()=>stop(new DOMException('Canceled','AbortError'));
 signal.addEventListener('abort',abort,{once:true});
 worker.onmessage=({data}:{data:{id:number;games:ResearchGame[]}})=>{pending.get(data.id)?.resolve(data.games);pending.delete(data.id);};
 worker.onerror=()=>stop(new Error('Game parsing could not start. Please reload and try again.'));
 return {parse:(pgns:string[],username:string)=>new Promise<ResearchGame[]>((resolve,reject)=>{if(stopped){reject(stopped);return;}if(signal.aborted){reject(new DOMException('Canceled','AbortError'));return;}const id=next++;pending.set(id,{resolve,reject});worker.postMessage({id,pgns,username});}),close:()=>{signal.removeEventListener('abort',abort);worker.terminate();}};
}
let database:Promise<IDBDatabase|null>|undefined;
function db(){return database??=new Promise<IDBDatabase|null>(resolve=>{try{const request=indexedDB.open('novachess-research-archives',1);request.onupgradeneeded=()=>request.result.createObjectStore('archives',{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);}catch{resolve(null);}});}
export async function cachedArchive(key:string):Promise<ResearchGame[]|null>{
 const database=await db();if(!database)return null;
 return new Promise(resolve=>{try{const request=database.transaction('archives').objectStore('archives').get(key);request.onsuccess=()=>resolve(request.result&&Date.now()-request.result.savedAt<86400000?request.result.games:null);request.onerror=()=>resolve(null);}catch{resolve(null);}});
}
export async function cacheArchive(key:string,games:ResearchGame[]){
 const database=await db();if(!database)return;
 await new Promise<void>(resolve=>{try{const transaction=database.transaction('archives','readwrite');transaction.objectStore('archives').put({key,games,savedAt:Date.now()});transaction.oncomplete=()=>resolve();transaction.onerror=()=>resolve();transaction.onabort=()=>resolve();}catch{resolve();}});
}
