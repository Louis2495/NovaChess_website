import {screenName,isGeneratedUsername} from "../lib/screenName";
import {useEffect,useState} from 'react';
import {online,useSiteAdmin,requestPasswordReset} from '../lib/online';
import {Button,Card,Field} from './UI';
type Account={id:string;username:string|null;screen_name?:string|null;email:string|null;created_at:string|null;last_sign_in_at:string|null;email_confirmed_at:string|null;provider:string};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString(): '—';
export default function AdminAccounts(){
 const {isAdmin,ready,userId}=useSiteAdmin();
 if(!ready)return <Card><p role="status">Loading…</p></Card>;
 if(!isAdmin)return <Card><p>Administrator access required.</p></Card>;
 return <AccountList key={userId}/>;
}
function GrantAdmin(){
 const [owner,setOwner]=useState(false),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void online!.rpc('is_site_owner').then(({data})=>{if(active)setOwner(data===true);});return()=>{active=false;};},[]);
 if(!owner)return null;
 return <form className="admin-grant" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');setError('');try{const {data,error}=await online!.rpc('grant_site_admin',{p_email:email.trim()});if(error)throw error;setMessage(`Administrator access granted to ${data.email}. They can sign out and back in to see Admin.`);setEmail('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <h3>Add an administrator</h3><label className="field"><input aria-label="Administrator email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off"/></label><Button disabled={busy}>{busy?'Granting…':'Grant admin access'}</Button>
 {message && <p role="status">{message}</p>}{error && <p role="alert" className="auth-error">{error}</p>}
 </form>;
}
function AccountList(){
 const [users,setUsers]=useState<Account[]>([]),[total,setTotal]=useState(0),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[resetting,setResetting]=useState(''),[hashes,setHashes]=useState<Record<string,string>>({}),[loadingHash,setLoadingHash]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');setHashes({});
  void online!.rpc('admin_accounts',{p_query:query,p_page:page}).then(({data,error})=>{
   if(!active)return;if(error){setError(error.message);setUsers([]);setTotal(0);}else{setUsers(data?.users||[]);setTotal(Number(data?.total)||0);}setLoading(false);
  });return()=>{active=false;};
 },[query,page]);
 const [onlineIds,setOnlineIds]=useState<Set<string>|null>(null);
 const [counts,setCounts]=useState<{online:number;offline:number}|null>(null);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{const {data,error}=await online!.rpc('admin_presence_counts');
    if(active)setCounts(!error && typeof data?.online==='number' && typeof data?.offline==='number'?data:null);
   }catch{if(active)setCounts(null);}
  };
  void refresh();const timer=window.setInterval(()=>void refresh(),30000);
  return()=>{active=false;window.clearInterval(timer);};
 },[]);
 const accountIds=users.map(user=>user.id).join(",");
 useEffect(()=>{
  let active=true;setOnlineIds(null);
  if(!accountIds)return;
  const refresh=async()=>{
   try{const {data,error}=await online!.rpc('admin_online_accounts',{p_users:accountIds.split(',')});
    if(active)setOnlineIds(!error && Array.isArray(data)?new Set(data):null);
   }catch{if(active)setOnlineIds(null);}
  };
  void refresh();const timer=window.setInterval(()=>void refresh(),30000);
  return()=>{active=false;window.clearInterval(timer);};
 },[accountIds]);
 return <Card className="admin-accounts"><div className="card-heading"><h2>Accounts</h2><span className="pill">{total}</span></div>
  <p className="admin-presence-counts" aria-label="Account activity totals"><span>{counts?.online ?? "—"} online</span><span>{counts?.offline ?? "—"} offline</span></p>
  <GrantAdmin/><form className="admin-account-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search.trim());}}><Field label="Search accounts"><input type="search" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Screen name, username or email"/></Field><Button>Search</Button></form>
  {error && <p role="alert" className="auth-error">{error}</p>}{message && <p role="status">{message}</p>}
  {loading?<p role="status">Loading accounts…</p>:<div className="admin-account-table"><table><thead><tr><th>Screen name</th><th>Username</th><th>Email</th><th>Joined</th><th>Last sign-in</th><th>Provider</th><th>Password</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><span className="admin-account-name"><span className={`account-status-dot ${onlineIds===null?'unknown':onlineIds.has(user.id)?'online':'offline'}`} role="img" aria-label={onlineIds===null?'Status unavailable':onlineIds.has(user.id)?'Online':'Offline'} title={onlineIds===null?'Status unavailable':onlineIds.has(user.id)?'Online':'Offline'}/><span>{screenName(user)}</span></span></td><td>{isGeneratedUsername(user.username)?'—':user.username||'—'}</td><td>{user.email||'—'}{user.email && !user.email_confirmed_at && <small>Not confirmed</small>}</td><td>{date(user.created_at)}</td><td>{date(user.last_sign_in_at)}</td><td>{user.provider}</td><td><div className="admin-password-actions"><Button className="secondary" disabled={!user.email || !!resetting} aria-label={`Send password reset to ${screenName(user,user.email||"Player")}`} onClick={async()=>{
   setResetting(user.id);setError('');setMessage('');try{await requestPasswordReset(user.email!);setMessage('Reset link requested. The user sets their own password.');}catch(e){setError((e as Error).message);}finally{setResetting('');}
  }}>{resetting===user.id?'Sending…':'Send reset'}</Button><Button className="text-button" disabled={!!loadingHash} aria-label={`${user.id in hashes?'Hide':'Show'} password hash for ${screenName(user)}`} onClick={async()=>{
   if(user.id in hashes){setHashes(current=>{const next={...current};delete next[user.id];return next;});return;}
   setLoadingHash(user.id);setError('');try{const {data,error}=await online!.rpc('admin_password_hash',{p_user:user.id});if(error)throw error;setHashes(current=>({...current,[user.id]:data || 'No password set'}));}catch(e){setError((e as Error).message);}finally{setLoadingHash('');}
  }}>{loadingHash===user.id?'Loading…':user.id in hashes?'Hide hash':'Show hash'}</Button></div>{user.id in hashes && <code className="admin-password-hash">{hashes[user.id]}</code>}</td></tr>)}</tbody></table>{!users.length && <p>No accounts found.</p>}</div>}
  <div className="admin-account-pagination"><Button className="secondary" disabled={loading || page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>{page+1} / {Math.max(1,Math.ceil(total/50))}</span><Button className="secondary" disabled={loading || (page+1)*50>=total} onClick={()=>setPage(p=>p+1)}>Next</Button></div>
 </Card>;
}
