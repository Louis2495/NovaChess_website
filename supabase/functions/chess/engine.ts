import load from './vendor/ffish.js';
import {setupOnlineEngine} from '../../../src/lib/onlineVariants.ts';
let engine:Promise<Awaited<ReturnType<typeof load>>>|null=null;
export function onlineEngine(){
 if(!engine)engine=Deno.readFile(new URL('./vendor/ffish.wasm',import.meta.url)).then(wasmBinary=>load({wasmBinary,print:()=>{},printErr:()=>{}})).then(ff=>{setupOnlineEngine(ff);return ff;}).catch(e=>{engine=null;throw e;});
 return engine;
}
