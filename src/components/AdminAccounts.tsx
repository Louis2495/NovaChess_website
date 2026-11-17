import {useEffect,useState} from 'react';
import {online,useSiteAdmin,requestPasswordReset} from '../lib/online';
import {Button,Card,Field} from './UI';
type Account={id:string;username:string|null;email:string|null;created_at:string|null;last_sign_in_at:string|null;email_confirmed_at:string|null;provider:string};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString(): '—';
export default function AdminAccounts(){
 const {isAdmin,ready,userId}=useSiteAdmin();
 if(!ready)return <Card><p role="status">Loading…</p></Card>;
 if(!isAdmin)return <Card><p>Administrator access required.</p></Card>;
 return <AccountList key={userId}/>;
}
function AccountList(){
 const [users,setUsers]=useState<Account[]>([]),[total,setTotal]=useState(0),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[resetting,setResetting]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');
  void online!.rpc('admin_accounts',{p_query:query,p_page:page}).then(({data,error})=>{
   if(!active)return;if(error){setError(error.message);setUsers([]);setTotal(0);}else{setUsers(data?.users||[]);setTotal(Number(data?.total)||0);}setLoading(false);
  });return()=>{active=false;};
 },[query,page]);
 return <Card className="admin-accounts"><div className="card-heading"><h2>Accounts</h2><span className="pill">{total}</span></div>
  <form className="admin-account-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search.trim());}}><Field label="Search accounts"><input type="search" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Username or email"/></Field><Button>Search</Button></form>
  {error && <p role="alert" className="auth-error">{error}</p>}{message && <p role="status">{message}</p>}
  {loading?<p role="status">Loading accounts…</p>:<div className="admin-account-table"><table><thead><tr><th>Username</th><th>Email</th><th>Joined</th><th>Last sign-in</th><th>Provider</th><th>Password</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td>{user.username||'—'}</td><td>{user.email||'—'}{user.email && !user.email_confirmed_at && <small>Not confirmed</small>}</td><td>{date(user.created_at)}</td><td>{date(user.last_sign_in_at)}</td><td>{user.provider}</td><td><Button className="secondary" disabled={!user.email || !!resetting} aria-label={`Send password reset to ${user.username||user.email}`} onClick={async()=>{
   setResetting(user.id);setError('');setMessage('');try{await requestPasswordReset(user.email!);setMessage('Reset link requested. The user sets their own password.');}catch(e){setError((e as Error).message);}finally{setResetting('');}
  }}>{resetting===user.id?'Sending…':'Send reset'}</Button></td></tr>)}</tbody></table>{!users.length && <p>No accounts found.</p>}</div>}
  <div className="admin-account-pagination"><Button className="secondary" disabled={loading || page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>{page+1} / {Math.max(1,Math.ceil(total/50))}</span><Button className="secondary" disabled={loading || (page+1)*50>=total} onClick={()=>setPage(p=>p+1)}>Next</Button></div>
 </Card>;
}
