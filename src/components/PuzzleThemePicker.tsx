import {useEffect,useRef,useState} from 'react';
import {Check,Search,SlidersHorizontal} from 'lucide-react';
import {humanTheme} from '../lib/moves';
export default function PuzzleThemePicker({value,themes,onChange}:{value:string;themes:string[];onChange:(value:string)=>void}) {
 const ref=useRef<HTMLDetailsElement>(null),searchRef=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState('');
 const label=(theme:string)=>theme==='All themes'?theme:humanTheme(theme);
 const options=['All themes',...themes].filter(theme=>label(theme).toLowerCase().includes(query.trim().toLowerCase()));
 function close(focus=false){if(ref.current){ref.current.open=false;if(focus)ref.current.querySelector('summary')?.focus();}}
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 return <details ref={ref} className="puzzle-theme-picker" onToggle={e=>{if(e.currentTarget.open)searchRef.current?.focus();else setQuery('');}} onKeyDown={e=>{
  if(e.key==='Escape'){e.preventDefault();close(true);}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')||[]);if(!buttons.length)return;
   e.preventDefault();const current=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[Math.max(0,Math.min(buttons.length-1,current+(e.key==='ArrowDown'?1:-1)))]?.focus();
  }
 }}>
  <summary aria-label="Puzzle theme settings" title={`Theme: ${label(value)}`}><SlidersHorizontal size={21}/></summary>
  <div className="theme-picker-menu"><h3>Theme</h3>
   <div className="theme-picker-search"><Search size={16}/><input ref={searchRef} type="search" aria-label="Search puzzle themes" placeholder="Find a theme" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <div className="theme-picker-options" role="listbox" aria-label="Puzzle themes">{options.map(theme=><button type="button" role="option" aria-selected={theme===value} key={theme} onClick={()=>{onChange(theme);close(true);}}><span>{label(theme)}</span>{theme===value&&<Check size={16}/>}</button>)}{!options.length&&<p className="theme-picker-empty">No themes match.</p>}</div>
  </div>
 </details>;
}
