import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {Opening} from '../lib/types';

export default function OpeningPicker({openings,value,onChange}:{openings:Opening[];value:string;onChange:(id:string)=>void}){
 const id=useId(),root=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0),[limit,setLimit]=useState(80),[above,setAbove]=useState(false),[popupHeight,setPopupHeight]=useState(280);
 const selected=openings.find(o=>o.id===value);
 const label=selected?`${selected.eco} · ${selected.name}`:'Any opening';
 const options=useMemo(()=>{
  const terms=query.trim().toLowerCase().split(/\s+/);
  const matches=openings.filter(o=>terms.every(t=>`${o.eco} ${o.name}`.toLowerCase().includes(t))).map(o=>({id:o.id,label:`${o.eco} · ${o.name}`}));
  return !query.trim() || 'any opening'.includes(query.toLowerCase())?[{id:'',label:'Any opening'},...matches]:matches;
 },[openings,query]);
 const shown=Math.max(limit,active+1);
 useEffect(()=>{if(open)root.current?.querySelector(`#${CSS.escape(id+'-option-'+active)}`)?.scrollIntoView({block:'nearest'});},[active,open,id]);
 function reveal(){if(!open){const rect=root.current?.querySelector('input')?.getBoundingClientRect();if(rect){const below=innerHeight-rect.bottom-12,up=rect.top-12,flip=below<200&&up>below;setAbove(flip);setPopupHeight(Math.max(60,Math.min(280,(flip?up:below)-34)));}setOpen(true);setQuery('');setActive(0);setLimit(80);}}
 function choose(index:number){const option=options[index];if(!option)return;onChange(option.id);setOpen(false);setQuery('');}
 return <div className="opening-picker" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>
 <label htmlFor={id}>Request an opening</label>
 <div className="opening-picker-input"><input id={id} role="combobox" aria-expanded={open} aria-controls={open?id+'-list':undefined} aria-autocomplete="list" aria-activedescendant={open&&options.length?id+'-option-'+active:undefined}
 value={open?query:label} placeholder={label} autoComplete="off" onFocus={reveal} onClick={reveal} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(0);setLimit(80);}}
 onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){reveal();return;}setActive(i=>Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1))));}else if(e.key==='Enter' && open){e.preventDefault();choose(active);}else if(e.key==='Escape'&&open){e.preventDefault();setOpen(false);}}}/><ChevronDown size={16} aria-hidden="true"/></div>
 {open && <div className={`opening-picker-popup${above?' above':''}`}><div style={{maxHeight:popupHeight}} id={id+'-list'} role="listbox" aria-label="Openings" onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-40)setLimit(n=>Math.min(options.length,n+80));}}>
 {options.slice(0,shown).map((option,index)=><button type="button" role="option" key={option.id} id={id+'-option-'+index} aria-selected={value===option.id} className={index===active?'highlighted':''} tabIndex={-1} onMouseDown={e=>e.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}>{option.label}</button>)}
 {!options.length && <p className="caption" role="status">No matching openings.</p>}
 </div><span className="opening-picker-count">{options.length.toLocaleString()} {options.length===1?'option':'options'}</span></div>}
 </div>;
}
