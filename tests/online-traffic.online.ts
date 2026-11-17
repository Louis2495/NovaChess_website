import load from "ffish-es6";
import {readFileSync} from "node:fs";
import {freshOnline,applyOnline,setupOnlineEngine} from "../src/lib/onlineVariants";
let ffPromise:Promise<Awaited<ReturnType<typeof load>>>|null=null;
function native(){return ffPromise ||= load({wasmBinary:readFileSync("node_modules/ffish-es6/ffish.wasm")}).then(ff=>{setupOnlineEngine(ff);return ff;});}
import {test,expect, type Page} from '@playwright/test';
import {Chess} from 'chess.js';
const uid='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',roomId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function connected(page:Page,signedIn=true){
 const c=new Chess(),initial=c.fen();const room:any={id:roomId,name:'Live room',mode:'standard',variant:'chess',state:{fen:initial,positions:[initial],moves:[],notation:[],result:'*'},members:[{id:uid,team:'w'},{id:peer,team:'b'}],queue:[],settings:{bot:false},status:'playing',revision:0,marks:[],deadline:null};
 const requests:URL[]=[],joins:any[]=[],sockets:any[]=[],actions:any[]=[];
 await page.addInitScript(({uid,signedIn})=>{if(!signedIn)return;const payload=btoa(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}));localStorage.setItem('sb-abcdefghijklmnopqrst-auth-token',JSON.stringify({access_token:`e30.${payload}.test`,refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,email:'player@example.test',app_metadata:{provider:'email'},user_metadata:{},aud:'authenticated',created_at:new Date().toISOString()}}));},{uid,signedIn});
 await page.route('https://abcdefghijklmnopqrst.supabase.co/**',async route=>{
  const url=new URL(route.request().url());requests.push(url);let data:any=[];
  if(url.pathname.endsWith('/settings'))data={external:{google:true,github:false,email:true}};
  else if(url.pathname.endsWith('/user'))data={id:uid,email:'player@example.test'};
  else if(url.pathname.includes('/rpc/is_chat_moderator'))data=false;
  else if(url.pathname.includes('/rpc/'))data=0;
  else if(url.pathname.endsWith('/functions/v1/chess')){const body=route.request().postDataJSON();actions.push(body);if(body.action==='move' && room.variant!=='chess'){room.state=applyOnline(await native(),room.variant,room.state,body.move);room.revision++;}else if(body.action==='move'){const move=c.move(body.move);room.state={...room.state,fen:c.fen(),moves:[...room.state.moves,body.move],notation:[...room.state.notation,move.san],positions:[...room.state.positions,c.fen()]};room.revision++;}data=room;}
  else if(url.pathname.endsWith('/profiles')){const ids=url.searchParams.get('id')||'';const people=[{id:uid,username:'Player',avatar:'',bio:'',country:'US'},{id:peer,username:'Opponent',avatar:'',country:'CA'}].filter(p=>!ids||ids.includes(p.id));data=route.request().headers().accept?.includes('vnd.pgrst.object')?people[0]:people;}
  else if(url.pathname.endsWith('/room_lobby'))data=[{id:roomId,name:room.name,mode:room.mode,variant:room.variant,status:room.status,member_count:room.members.length}];
  else if(url.pathname.endsWith('/rooms'))data=url.searchParams.has('id')?room:[room];
  else if(url.pathname.endsWith('/messages'))data=[{id:1,user_id:peer,body:'Initial message',created_at:new Date().toISOString()}];
  await route.fulfill({json:data});
 });
 await page.routeWebSocket('wss://abcdefghijklmnopqrst.supabase.co/**',ws=>{
  sockets.push(ws);ws.onMessage(raw=>{const frame=JSON.parse(String(raw)),[joinRef,ref,topic,event,payload]=frame;
   if(event==='phx_join'){joins.push({topic,payload,ws});const postgres_changes=(payload.config.postgres_changes||[]).map((p:any,i:number)=>({...p,id:i+1}));ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes}}]));}
   else if(event==='heartbeat')ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]));
  });
 });
 function emit(table:string,next:any,type='UPDATE'){const join=joins.find(j=>j.payload.config.postgres_changes.some((p:any)=>p.table===table));if(!join)throw Error('No '+table+' subscription');join.ws.send(JSON.stringify([null,null,join.topic,'postgres_changes',{ids:[1],data:{schema:'public',table,commit_timestamp:new Date().toISOString(),type,columns:[],record:next,old_record:{id:next.id},errors:null}}]));}
 return {requests,joins,sockets,room,emit,c,actions};
}
test('lobby stays light and live games subscribe only to their room without reloading room lists',async({page})=>{
 const env=await connected(page);await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();expect(env.sockets).toHaveLength(0);await expect(page.getByText('Room name',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Play online',exact:true}).click();const lobby=env.requests.find(u=>u.pathname.endsWith('/room_lobby'))!;expect(lobby.searchParams.get('select')).not.toContain('state');
 await expect(page.locator('.chess-layout .board').first()).toBeVisible();await expect.poll(()=>env.joins.length).toBe(1);expect(env.joins[0].payload.config.postgres_changes[0].filter).toBe('id=eq.'+roomId);await page.waitForTimeout(100);const reads=env.requests.filter(u=>u.pathname.endsWith('/rooms')).length;await page.getByRole('button',{name:'e2, white pawn',exact:true}).click();await page.getByRole('button',{name:'e4, empty',exact:true}).click();await expect(page.getByRole('button',{name:'e4, white pawn',exact:true})).toBeVisible();expect(env.requests.filter(u=>u.pathname.endsWith('/rooms')).length).toBe(reads);env.c.move('e5');env.emit('rooms',{...env.room,revision:2,state:{...env.room.state,fen:env.c.fen(),moves:['e2e4','e7e5'],notation:['e4','e5'],positions:[...env.room.state.positions,env.c.fen()]}});await expect(page.getByRole('button',{name:'e5, black pawn',exact:true})).toBeVisible();env.emit('rooms',{...env.room,revision:1});await expect(page.getByRole('button',{name:'e5, black pawn',exact:true})).toBeVisible();expect(env.requests.filter(u=>u.pathname.endsWith('/rooms')).length).toBe(reads);
});
test('chat applies incoming messages without reloading history or all user profiles',async({page})=>{
 const env=await connected(page);await page.goto('/');await page.getByRole('button',{name:'Open global chat',exact:true}).click();await expect(page.getByText('Initial message',{exact:true})).toBeVisible();await expect.poll(()=>env.joins.length).toBe(1);await page.waitForTimeout(100);const history=env.requests.filter(u=>u.pathname.endsWith('/messages')).length,profiles=env.requests.filter(u=>u.pathname.endsWith('/profiles')).length;env.emit('messages',{id:2,user_id:peer,body:'One incremental message',created_at:new Date().toISOString()},'INSERT');await expect(page.getByText('One incremental message',{exact:true})).toBeVisible();expect(env.requests.filter(u=>u.pathname.endsWith('/messages')).length).toBe(history);expect(env.requests.filter(u=>u.pathname.endsWith('/profiles')).length).toBe(profiles);expect(env.requests.filter(u=>u.pathname.endsWith('/profiles')).every(u=>u.searchParams.has('id'))).toBe(true);
});
test('account shows only OAuth providers enabled in Supabase',async({page})=>{
 await connected(page);await page.goto('/#profile');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Continue with Google',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Continue with GitHub',exact:true})).toHaveCount(0);
});

test('Google-only sign-in needs no email signup form or SMTP',async({page})=>{
 await connected(page);await page.route('**/auth/v1/settings',r=>r.fulfill({json:{external:{google:true,github:false,email:false}}}));await page.goto('/#profile');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Continue with Google',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Email',exact:true})).toHaveCount(0);await page.route('**/auth/v1/authorize*',r=>r.fulfill({contentType:'text/html',body:'OAuth redirect'}));const request=page.waitForRequest(r=>r.url().includes('/auth/v1/authorize'));await page.getByRole('button',{name:'Continue with Google',exact:true}).click();const url=new URL((await request).url());expect(url.searchParams.get('provider')).toBe('google');expect(url.searchParams.get('code_challenge')).toBeTruthy();
});

test('a message arriving during history loading survives the older snapshot response',async({page})=>{
 const env=await connected(page),waiting:(()=>void)[]=[];
 await page.route('**/rest/v1/messages?*',async route=>{await new Promise<void>(resolve=>waiting.push(resolve));await route.fulfill({json:[{id:1,user_id:peer,body:'Older snapshot',created_at:new Date().toISOString()}]});});
 await page.goto('/');await page.getByRole('button',{name:'Open global chat',exact:true}).click();await expect.poll(()=>waiting.length).toBe(2);env.emit('messages',{id:2,user_id:peer,body:'Arrived while loading',created_at:new Date().toISOString()},'INSERT');await expect(page.getByText('Arrived while loading',{exact:true})).toBeVisible();for(const release of waiting)release();await expect(page.getByText('Older snapshot',{exact:true})).toBeVisible();await expect(page.getByText('Arrived while loading',{exact:true})).toBeVisible();
});

test('Vote Chess keeps its ballot subscriptions stable and ignores old ballot deletion traffic',async({page})=>{
 const env=await connected(page);env.room.mode='vote';env.room.deadline=new Date(Date.now()+86400000).toISOString();await page.goto('/#community/'+roomId);await expect.poll(()=>env.joins.length).toBe(2);const bindings=env.joins.find(j=>j.topic.includes('votes-')).payload.config.postgres_changes;expect(bindings.map((b:any)=>b.event)).toEqual(['INSERT','UPDATE']);env.emit('rooms',{...env.room,revision:1});await page.waitForTimeout(100);expect(env.joins).toHaveLength(2);
});


test('Play online directly joins a waiting standard opponent without a room form',async({page})=>{
 const env=await connected(page);env.room.members=[{id:peer,team:'w'}];env.room.status='waiting';
 await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();await page.getByRole('button',{name:'Play online',exact:true}).click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'join',room:roomId});
 const query=env.requests.find(u=>u.pathname.endsWith('/room_lobby'))!;expect(query.searchParams.get('mode')).toBe('eq.standard');expect(query.searchParams.get('variant')).toBe('eq.chess');
 await expect(page.getByLabel('Room name',{exact:true})).toHaveCount(0);
});

test('Play online starts a waiting game when no opponent is available',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/room_lobby?*',r=>r.fulfill({json:[]}));
 await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();await page.getByRole('button',{name:'Play online',exact:true}).click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'create',mode:'standard',variant:'chess',name:'Standard'});
});

test('bottom-right Sign in opens the account form and disappears after authentication',async({page})=>{
 await connected(page);await page.goto('/#profile');await expect(page.locator('.floating-sign-in')).toHaveCount(0);await page.getByRole('button',{name:'Sign out',exact:true}).click();
 const action=page.locator('.floating-sign-in');await expect(action).toBeVisible();await expect(action).toHaveCSS('position','fixed');await action.click();
 await expect(page).toHaveURL(/#signin/);await expect(page.getByRole('heading',{name:'Sign in',level:1})).toBeVisible();await expect(page.getByRole('button',{name:'Create an account',exact:true})).toBeVisible();await page.getByRole('button',{name:'Create an account',exact:true}).click();await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeVisible();
});


test('online Duck requires both a piece move and duck placement',async({page})=>{
 const env=await connected(page),ff=await native();env.room.variant='duck';env.room.state=freshOnline(ff,'duck');
 await page.goto('/#variants/online/'+roomId);const board=page.locator('.chess-layout .board').first();await board.getByRole('button',{name:'e2, white pawn',exact:true}).click();await board.getByRole('button',{name:'e4, empty',exact:true}).click();expect(env.actions).toHaveLength(0);
 await board.getByRole('button',{name:'d5, empty',exact:true}).click();await expect.poll(()=>env.room.state.moves.length).toBe(1);expect(env.actions[0].move).toMatch(/^e2e4,.*d5$/);
});
test('online Crazyhouse exposes captured pocket pieces and validates drops',async({page})=>{
 const env=await connected(page),ff=await native();env.room.variant='crazyhouse';let state=freshOnline(ff,'crazyhouse');for(const move of ['e2e4','d7d5','e4d5','e7e6'])state=applyOnline(ff,'crazyhouse',state,move);env.room.state=state;
 await page.goto('/#variants/online/'+roomId);await page.getByRole('button',{name:'Drop P',exact:true}).click();await page.getByRole('button',{name:'e3, empty',exact:true}).click();await expect.poll(()=>env.room.state.moves.at(-1)).toBe('P@e3');
});
test('online blindfold text has a move form instead of a visible board',async({page})=>{
 const env=await connected(page),ff=await native();env.room.variant='blindtext';env.room.state=freshOnline(ff,'blindtext');await page.goto('/#variants/online/'+roomId);
 await expect(page.locator('.chess-layout .board')).toHaveCount(0);const input=page.getByLabel('Blindfold move',{exact:true});await input.fill('e4');await input.press('Enter');await expect.poll(()=>env.room.state.moves.at(-1)).toBe('e2e4');await expect(input).toHaveValue('');
});


test('password visibility and forgotten-password requests work without revealing account existence',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await connected(page,false);await page.goto('/#signin');const password=page.getByLabel('Password',{exact:true});await password.fill('Fake-password-123');await expect(password).toHaveAttribute('type','password');await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(password).toHaveAttribute('type','text');await page.getByRole('button',{name:'Hide password',exact:true}).click();await expect(password).toHaveAttribute('type','password');
 let sent:any;await page.route('**/auth/v1/recover*',async r=>{sent=r.request().postDataJSON();await r.fulfill({json:{}});});await page.getByRole('button',{name:'Forgot password?',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill('friend@example.test');await page.getByRole('button',{name:'Send reset link',exact:true}).click();await expect(page.getByRole('status')).toContainText('If this email has an account');expect(sent.email).toBe('friend@example.test');await expect(page.getByLabel('Password',{exact:true})).toHaveCount(0);
});

test('a token-hash email link works in a fresh browser and saves the new password',async({page})=>{
 await connected(page,false);const user={id:uid,email:'player@example.test',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const payload=Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');let verification:any,updated:any;
 await page.route('**/auth/v1/verify',async r=>{verification=r.request().postDataJSON();await r.fulfill({json:{access_token:`e30.${payload}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user}});});
 await page.route('**/auth/v1/user',async r=>{if(r.request().method()==='PUT')updated=r.request().postDataJSON();await r.fulfill({json:user});});
 await page.goto('/?token_hash=test-one-time-hash&type=recovery');await expect(page.getByLabel('New password',{exact:true})).toBeVisible();expect(verification).toMatchObject({token_hash:'test-one-time-hash',type:'recovery'});expect(page.url()).not.toContain('token_hash');
 await page.getByLabel('New password',{exact:true}).fill('Fake-new-password-123');await page.getByLabel('Confirm password',{exact:true}).fill('Different-password-123');await page.getByRole('button',{name:'Save password',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');expect(updated).toBeUndefined();
 await page.getByLabel('Confirm password',{exact:true}).fill('Fake-new-password-123');await page.getByRole('button',{name:'Save password',exact:true}).click();await expect(page).toHaveURL(/#profile$/);expect(updated.password).toBe('Fake-new-password-123');expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Fake-new-password-123');
});

test('an expired recovery link cannot show a password update form',async({page})=>{
 await connected(page,false);await page.route('**/auth/v1/verify',r=>r.fulfill({status:403,json:{code:403,error_code:'otp_expired',msg:'Expired'}}));await page.goto('/?token_hash=expired-hash&type=recovery');await expect(page.getByText('This link is invalid or expired.',{exact:true})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Request a new link',exact:true}).click();await expect(page.getByRole('button',{name:'Send reset link',exact:true})).toBeVisible();
});

test('only administrators can open the account directory, search and send a reset',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await connected(page);await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:true}));const queries:any[]=[];let sent:any;
 await page.route('**/rest/v1/rpc/admin_accounts',async r=>{const body=r.request().postDataJSON();queries.push(body);await r.fulfill({json:{total:51,users:[{id:peer,username:body.p_page?'Second player':'Friend',email:'friend@example.test',created_at:'2026-01-01T00:00:00Z',last_sign_in_at:null,email_confirmed_at:'2026-01-01T00:00:00Z',provider:'email'}]}});});
 await page.route('**/auth/v1/recover*',async r=>{sent=r.request().postDataJSON();await r.fulfill({json:{}});});
 await page.goto('/#profile');await page.getByRole('button',{name:'Admin',exact:true}).click();await expect(page.getByRole('cell',{name:'Friend',exact:true})).toBeVisible();await page.getByRole('button',{name:'Send password reset to Friend',exact:true}).click();expect(sent.email).toBe('friend@example.test');await expect(page.getByRole('status')).toContainText('The user sets their own password');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('cell',{name:'Second player',exact:true})).toBeVisible();expect(queries.at(-1).p_page).toBe(1);await page.getByLabel('Search accounts',{exact:true}).fill('Friend');await page.getByRole('button',{name:'Search',exact:true}).click();await expect.poll(()=>queries.at(-1)).toMatchObject({p_query:'Friend',p_page:0});
 await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:false}));await page.reload();await expect(page.getByText('Administrator access required.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Admin',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'friend@example.test',exact:true})).toHaveCount(0);
});
