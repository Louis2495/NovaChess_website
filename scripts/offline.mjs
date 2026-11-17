import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
const all = (await files("dist"))
  .filter(
    (p) =>
      !p.endsWith("/sw.js") &&
      !p.endsWith(".mp3") &&
      !p.endsWith(".woff") &&
      !p.includes("/licenses/"),
  )
  .sort();
const hash = createHash("sha256");
const revisions = {};
for (const f of all) {
  hash.update(f);
  const bytes=await readFile(f);
  hash.update(bytes);
  revisions["./"+f.slice(5)]=createHash("sha256").update(bytes).digest("hex");
}
const version = hash.digest("hex").slice(0, 12);
const urls = all.map((p) => "./" + p.slice(5));
const sw = `const prefix='novachess-'+self.registration.scope+'-';const CACHE=prefix+${JSON.stringify(version)};const FILES=${JSON.stringify(urls)};const REVISIONS=${JSON.stringify(revisions)};const META=new URL('__asset-revisions.json',self.registration.scope).href;
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),keys=await caches.keys();
 const previousKey=keys.filter(k=>k.startsWith(prefix)&&k!==CACHE).pop();
 const previous=previousKey?await caches.open(previousKey):null;
 let old={};if(previous){try{const metadata=await previous.match(META);if(metadata)old=await metadata.json();}catch{}}
 let cursor=0;await Promise.all(Array.from({length:6},async()=>{while(cursor<FILES.length){const file=FILES[cursor++],url=new URL(file,self.registration.scope).href;let response=previous&&old[file]===REVISIONS[file]?await previous.match(url):null;if(!response)response=await fetch(new Request(url,{cache:'reload'}));if(!response.ok)throw Error('Offline asset unavailable');await cache.put(url,response);}}));
 await cache.put(META,new Response(JSON.stringify(REVISIONS),{headers:{'Content-Type':'application/json'}}));await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match(new URL('./index.html',self.registration.scope))));return}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}return response})))})`;

await writeFile("dist/sw.js", sw);
console.log(
  `Offline cache: ${urls.length} local assets. Music caches after first use.`,
);
