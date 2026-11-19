import {useEffect,useState} from 'react';
import {base} from '../lib/store';
export default function ResearchLoadingAnimation() {
 const [failed,setFailed]=useState(false),[reduceMotion,setReduceMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduceMotion(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const poster=`${base}learn/research-reading-king.webp`;
 return <div className="research-reading-animation" role="img" aria-label="A king wearing glasses flips through a book">
  {failed||reduceMotion?<img src={poster} alt=""/>:<video autoPlay loop muted playsInline preload="auto" poster={poster} aria-hidden="true" onError={()=>setFailed(true)}><source src={`${base}learn/research-reading-king.webm`} type="video/webm" onError={()=>setFailed(true)}/></video>}
 </div>;
}
