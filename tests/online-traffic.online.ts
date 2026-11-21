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
  else if(url.pathname.endsWith('/room_lobby'))data=[{id:roomId,name:room.name,mode:room.mode,variant:room.variant,status:room.status,member_count:room.members.length,time_control:room.settings.timeControlSeconds||180,increment_seconds:room.settings.incrementSeconds||0}];
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
 function broadcast(next:any){const join=joins.find(j=>j.topic==='realtime:room:'+roomId);if(!join)throw Error('No private game channel');join.ws.send(JSON.stringify([null,null,join.topic,'broadcast',{type:'broadcast',event:'state',payload:next}]));}
 return {requests,joins,sockets,room,emit,c,actions,broadcast};
}
test('lobby stays light and live games subscribe only to their room without reloading room lists',async({page})=>{
 const env=await connected(page);await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();expect(env.sockets).toHaveLength(0);await expect(page.getByText('Room name',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Start',exact:true}).click();const lobby=env.requests.find(u=>u.pathname.endsWith('/room_lobby'))!;expect(lobby.searchParams.get('select')).not.toContain('state');
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
 await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'join',room:roomId});
 const query=env.requests.find(u=>u.pathname.endsWith('/room_lobby'))!;expect(query.searchParams.get('mode')).toBe('eq.standard');expect(query.searchParams.get('variant')).toBe('eq.chess');
 await expect(page.getByLabel('Room name',{exact:true})).toHaveCount(0);
});

test('Play online starts a waiting game when no opponent is available',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/room_lobby?*',r=>r.fulfill({json:[]}));
 await page.goto('/#play');await page.getByRole('button',{name:'Online',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'create',mode:'standard',variant:'chess',name:'Standard'});
});

test('sidebar Sign in sits above the username and opens the account form',async({page})=>{
 await connected(page);await page.goto('/#profile');await expect(page.locator('.sidebar-sign-in')).toHaveCount(0);await page.getByRole('button',{name:'Sign out',exact:true}).click();
 const action=page.locator('.sidebar-sign-in');await expect(action).toBeVisible();const signIn=(await action.boundingBox())!,profile=(await page.locator('.account-stamp').boundingBox())!;expect(signIn.y+signIn.height).toBeLessThanOrEqual(profile.y);await expect(page.locator('.floating-sign-in')).toHaveCount(0);await action.click();
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
 await page.route('**/rest/v1/rpc/admin_accounts',async r=>{const body=r.request().postDataJSON();queries.push(body);await r.fulfill({json:{total:51,users:[{id:peer,username:'player_internalhash',screen_name:body.p_page?'Second player':'Friend',email:'friend@example.test',created_at:'2026-01-01T00:00:00Z',last_sign_in_at:null,email_confirmed_at:'2026-01-01T00:00:00Z',provider:'email'}]}});});
 await page.route('**/auth/v1/recover*',async r=>{sent=r.request().postDataJSON();await r.fulfill({json:{}});});
 await page.goto('/#profile');await page.getByRole('button',{name:'Admin',exact:true}).click();await expect(page.getByText('Friend',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Send password reset to Friend',exact:true}).click();expect(sent.email).toBe('friend@example.test');await expect(page.getByRole('status')).toContainText('The user sets their own password');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Second player',{exact:true})).toBeVisible();expect(queries.at(-1).p_page).toBe(1);await page.getByLabel('Search accounts',{exact:true}).fill('Friend');await page.getByRole('button',{name:'Search',exact:true}).click();await expect.poll(()=>queries.at(-1)).toMatchObject({p_query:'Friend',p_page:0});
 await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:false}));await page.reload();await expect(page.getByText('Administrator access required.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Admin',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'friend@example.test',exact:true})).toHaveCount(0);
});

test('public player labels use screen names instead of generated account handles',async({page})=>{
 const env=await connected(page);
 await page.route('**/rest/v1/profiles?*',async r=>{const url=new URL(r.request().url()),filter=url.searchParams.get('id')||'';const people=[{id:uid,username:'player_ownerhash',screen_name:'Knight Owl',bio:'',country:'US',avatar:''},{id:peer,username:'player_peerhash',screen_name:'Fork Master',bio:'',country:'CA',avatar:''}].filter(p=>!filter || filter.includes(p.id));await r.fulfill({json:r.request().headers().accept?.includes('vnd.pgrst.object')?people[0]:people});});
 await page.goto('/#play/online/'+roomId);await expect(page.getByText('Fork Master',{exact:true})).toBeVisible();await expect(page.locator('.sidebar-bottom')).toContainText('Knight Owl');await expect(page.locator('body')).not.toContainText('player_ownerhash');await expect(page.locator('body')).not.toContainText('player_peerhash');
 await page.getByRole('button',{name:'Open global chat',exact:true}).click();await expect(page.locator('.chat-entry-meta b').first()).toHaveText('Fork Master');
 await page.goto('/#profile');await expect(page.getByLabel('Screen name',{exact:true})).toHaveValue('Knight Owl');
});

test('admin password hashes are not prefetched and hide on request',async({page})=>{
 await connected(page);await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:true}));await page.route('**/rest/v1/rpc/admin_accounts',r=>r.fulfill({json:{total:1,users:[{id:peer,username:'player_internal',screen_name:'Fork Master',email:'friend@example.test',created_at:null,last_sign_in_at:null,email_confirmed_at:null,provider:'email'}]}}));let reads=0;const hash='$2b$12$test-hash-not-a-real-password';await page.route('**/rest/v1/rpc/admin_password_hash',async r=>{reads++;expect(r.request().postDataJSON()).toEqual({p_user:peer});await r.fulfill({json:hash});});
 await page.goto('/#profile/admin');await expect(page.getByRole('columnheader',{name:'Screen name',exact:true})).toBeVisible();await expect(page.getByText('Fork Master',{exact:true})).toBeVisible();expect(reads).toBe(0);await expect(page.locator('body')).not.toContainText('player_internal');await page.getByRole('button',{name:'Show password hash for Fork Master',exact:true}).click();await expect(page.locator('.admin-password-hash')).toHaveText(hash);expect(reads).toBe(1);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(hash);await page.getByRole('button',{name:'Hide password hash for Fork Master',exact:true}).click();await expect(page.locator('.admin-password-hash')).toHaveCount(0);
});

test('signup sends name, country and a premade picture to the profile trigger',async({page})=>{
 await connected(page,false);let signup:any;await page.route('**/auth/v1/signup*',async r=>{signup=r.request().postDataJSON();await r.fulfill({json:{id:uid,email:'new@example.test',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{screen_name:'Queen Bee'},identities:[],created_at:new Date().toISOString()}});});await page.goto('/#signin');await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByLabel('Screen name',{exact:true}).fill('Queen Bee');await page.getByLabel('Country of origin',{exact:true}).selectOption('CA');const pawn=page.getByRole('button',{name:'Clay mustache pawn',exact:true});await pawn.click();await expect(pawn).toHaveAttribute('aria-pressed','true');await page.getByLabel('Email',{exact:true}).fill('new@example.test');await page.getByLabel('Password',{exact:true}).fill('Fake-password-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('status')).toContainText('Check your email');expect(signup.data).toMatchObject({screen_name:'Queen Bee',country:'CA',avatar:expect.stringMatching(/^data:image\/jpeg;base64,/)});
});

test('new OAuth users finish their country and uploaded picture after sign-in', async ({page}) => {
  await connected(page, false);
  await page.addInitScript(uid => {
    const now = Date.now();
    const payload = btoa(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(now/1000)+3600}));
    sessionStorage.setItem('novachess-oauth-signup-intent', String(now-1000));
    localStorage.setItem('sb-abcdefghijklmnopqrst-auth-token', JSON.stringify({
      access_token:`e30.${payload}.test`,refresh_token:'refresh',expires_at:Math.floor(now/1000)+3600,token_type:'bearer',
      user:{id:uid,email:'new@example.test',app_metadata:{provider:'google'},user_metadata:{},aud:'authenticated',created_at:new Date(now).toISOString()},
    }));
  },uid);
  let update: unknown;
  await page.route('**/rest/v1/profiles?*', async route => {
    if (route.request().method()==='PATCH') {
      update = route.request().postDataJSON();
      return route.fulfill({status:204,body:''});
    }
    await route.fulfill({json:{id:uid,username:'player_new',screen_name:'',bio:'',country:'JP',avatar:''}});
  });
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Set up your profile',level:2})).toBeVisible();
  await page.getByLabel('Country of origin',{exact:true}).selectOption('JP');
  await page.getByLabel('Upload a profile picture',{exact:true}).setInputFiles('public/avatars/knight.webp');
  await expect(page.getByRole('img',{name:'Selected profile picture'})).toBeVisible();
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page).toHaveURL(/#profile$/);
  expect(update).toMatchObject({country:'JP',avatar:expect.stringMatching(/^data:image\/jpeg;base64,/)});
});



test('moves render before acknowledgement and an older acknowledgement cannot undo an opponent reply',async({page})=>{
 const env=await connected(page);let release:(()=>void)|undefined;
 await page.route('**/functions/v1/chess',async r=>{if(r.request().postDataJSON().move==='g1f3'){const c=new Chess();c.move('e4');c.move('e5');c.move('Nf3');await r.fulfill({json:{...env.room,revision:3,state:{...env.room.state,fen:c.fen(),moves:['e2e4','e7e5','g1f3'],notation:['e4','e5','Nf3']}}});return;}const c=new Chess();c.move('e4');const response={...env.room,revision:1,state:{...env.room.state,fen:c.fen(),moves:['e2e4'],notation:['e4'],positions:[env.room.state.fen,c.fen()]}};await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:response});});
 await page.goto('/#play/online/'+roomId);await expect.poll(()=>env.joins.length).toBe(1);await page.getByRole('button',{name:'e2, white pawn',exact:true}).click();await page.getByRole('button',{name:'e4, empty',exact:true}).click();await expect(page.getByRole('button',{name:'e4, white pawn',exact:true})).toBeVisible();expect(release).toBeTruthy();
 const c=new Chess();c.move('e4');c.move('e5');env.emit('rooms',{...env.room,revision:2,state:{...env.room.state,fen:c.fen(),moves:['e2e4','e7e5'],notation:['e4','e5']}});await expect(page.getByRole('button',{name:'e5, black pawn',exact:true})).toBeVisible();await page.getByRole('button',{name:'g1, white knight',exact:true}).click();await page.getByRole('button',{name:'f3, empty',exact:true}).click();await expect(page.getByRole('button',{name:'f3, white knight',exact:true})).toBeVisible();release!();await page.waitForTimeout(80);await expect(page.getByRole('button',{name:'e5, black pawn',exact:true})).toBeVisible();
});
test('a rejected optimistic move reconciles with authoritative state',async({page})=>{
 await connected(page);let release:(()=>void)|undefined;await page.route('**/functions/v1/chess',async r=>{await new Promise<void>(resolve=>release=resolve);await r.fulfill({status:409,json:{error:'Position changed. Try again.'}});});
 await page.goto('/#play/online/'+roomId);await page.getByRole('button',{name:'e2, white pawn',exact:true}).click();await page.getByRole('button',{name:'e4, empty',exact:true}).click();await expect(page.getByRole('button',{name:'e4, white pawn',exact:true})).toBeVisible();release!();await expect(page.getByRole('button',{name:'e2, white pawn',exact:true})).toBeVisible();
});
test('committed private broadcast updates the opponent board without a database-change subscription',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/rpc/room_broadcast_ready',r=>r.fulfill({json:true}));await page.goto('/#play/online/'+roomId);await expect.poll(()=>env.joins.length).toBe(1);expect(env.joins[0].payload.config.private).toBe(true);expect(env.joins[0].payload.config.postgres_changes).toEqual([]);const c=new Chess();c.move('e4');env.broadcast({...env.room,revision:1,state:{...env.room.state,fen:c.fen(),moves:['e2e4'],notation:['e4']}});await expect(page.getByRole('button',{name:'e4, white pawn',exact:true})).toBeVisible();
});
test('Throne has one illustrated title, scoped chat and a persistent resignation result',async({page})=>{
 const env=await connected(page);env.room.mode='throne';env.room.state.gameKey='round1';await page.route('**/rest/v1/room_messages?*',r=>r.fulfill({json:[]}));let sent:any;await page.route('**/rest/v1/rpc/post_room_message',async r=>{sent=r.request().postDataJSON();await r.fulfill({json:{id:20,room_id:roomId,user_id:uid,body:sent.p_body,created_at:new Date().toISOString()}});});
 await page.goto('/#variants/online/'+roomId);await expect(page.getByRole('heading',{name:'Throne',exact:true})).toHaveCount(1);await expect(page.locator('.online-game-heading .multiplayer-picture')).toBeVisible();await expect(page.getByRole('button',{name:'Invite friends',exact:true})).toHaveCount(0);await page.getByLabel('Game chat message',{exact:true}).fill('Good game!');await page.getByRole('button',{name:'Send chat message',exact:true}).click();await expect(page.getByRole('log',{name:'Game chat',exact:true})).toContainText('Good game!');expect(sent.p_room).toBe(roomId);
 await expect.poll(()=>env.joins.some(j=>j.topic==='realtime:room-'+roomId)).toBe(true);env.emit('rooms',{...env.room,revision:1,members:[{id:uid,team:'w'},{id:peer,team:null}],status:'waiting',state:{...env.room.state,gameKey:'round2',lastWinner:uid,lastGame:{id:'round1',result:'1-0',white:uid,black:peer,reason:'resignation',resignedBy:peer}}});await expect(page.getByText('You won!',{exact:true})).toBeVisible();await expect(page.getByText('Opponent resigned.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('.throne-round-result')).toHaveCount(0);
});
test('leaving the Throne variant sends Finish for the waiting champion', async ({page}) => {
 const env = await connected(page);
 env.room.mode = 'throne';
 env.room.status = 'waiting';
 env.room.members = [{id:uid,team:'w'}];
 env.room.state.lastWinner = uid;
 await page.route('**/rest/v1/room_messages?*', route => route.fulfill({json:[]}));
 await page.route('**/functions/v1/chess', route => {
  env.actions.push(route.request().postDataJSON());
  return route.fulfill({json:{...env.room,members:[],revision:1}});
 });
 await page.goto('/#variants/online/'+roomId);
 await expect(page.getByRole('button',{name:'Finish',exact:true})).toBeVisible();
 await page.evaluate(() => { location.hash = '#stats'; });
 await expect.poll(() => env.actions).toEqual([{action:'finish',room:roomId}]);
});
test('standard online games expose 3, 3+2, 5 and 10 minute controls',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/room_lobby?*',r=>r.fulfill({json:[]}));await page.goto('/#play');const controls=page.getByRole('group',{name:'Time control',exact:true});await expect(controls.getByRole('button')).toHaveCount(4);await controls.getByRole('button',{name:'10',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();await expect.poll(()=>env.actions.length).toBe(1);expect(env.actions[0].timeControlSeconds).toBe(600);
});

test('consecutive online premoves advance on verified updates while an older HTTP response is pending',async({page})=>{
 const env=await connected(page);let release:(()=>void)|undefined;const submitted:string[]=[];
 const update=()=>{env.room.state={...env.room.state,fen:env.c.fen(),moves:env.c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')),notation:env.c.history()};env.room.revision=env.room.state.moves.length;};
 await page.route('**/functions/v1/chess',async r=>{const body=r.request().postDataJSON();submitted.push(body.move);env.c.move(body.move);update();const reply=structuredClone(env.room);if(body.move==='e2e4')await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:reply});});
 await page.goto('/#play/online/'+roomId);await expect.poll(()=>env.joins.length).toBe(1);
 const move=async(from:string,to:string)=>{await page.getByRole('button',{name:new RegExp('^'+from+',')}).click();await page.getByRole('button',{name:new RegExp('^'+to+',')}).click();};
 await move('e2','e4');await move('g1','f3');await move('f3','g5');await expect(page.locator('.queued-moves')).toContainText('f3–g5');
 env.c.move('e5');update();env.emit('rooms',structuredClone(env.room));await expect.poll(()=>submitted).toContain('g1f3');
 env.c.move('Nc6');update();env.emit('rooms',structuredClone(env.room));await expect.poll(()=>submitted).toContain('f3g5');await expect(page.getByRole('button',{name:'g5, white knight',exact:true})).toBeVisible();release!();await expect(page.locator('.queued-moves')).toHaveCount(0);
});

test('an expired live clock waits for server confirmation before showing the result',async({page})=>{
 const env=await connected(page);env.room.state.clock={remaining:{w:0,b:60000},startedAt:Date.now()-1000};let release:(()=>void)|undefined;let claim:any;
 await page.route('**/functions/v1/chess',async r=>{claim=r.request().postDataJSON();await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:{...env.room,revision:1,status:'finished',state:{...env.room.state,result:'0-1',clock:{...env.room.state.clock,startedAt:null}}}});});
 await page.goto('/#play/online/'+roomId);await expect(page.getByRole('timer',{name:'White clock',exact:true})).toHaveText('0:00');await expect.poll(()=>claim?.action).toBe('claim_timeout');await expect(page.getByText('Black won',{exact:true})).toHaveCount(0);release!();await expect(page.getByText('Black won',{exact:true})).toBeVisible();
});

test('3+2 matchmaking sends both the base time and increment',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/room_lobby?*',r=>{env.requests.push(new URL(r.request().url()));return r.fulfill({json:[]});});await page.goto('/#play');await page.getByRole('button',{name:'3|2',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();await expect.poll(()=>env.actions.length).toBe(1);expect(env.actions[0].timeControlSeconds).toBe(180);expect(env.actions[0].incrementSeconds).toBe(2);
 const lobby=env.requests.find(u=>u.pathname.endsWith('/room_lobby'))!;expect(lobby.searchParams.get('increment_seconds')).toBe('eq.2');
});
test('the owner can grant administrator access by email, while delegated admins cannot see that form',async({page})=>{
 await connected(page);let owner=true;const grants:string[]=[];
 await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:true}));
 await page.route('**/rest/v1/rpc/is_site_owner',r=>r.fulfill({json:owner}));
 await page.route('**/rest/v1/rpc/admin_accounts',r=>r.fulfill({json:{users:[],total:0}}));
 await page.route('**/rest/v1/rpc/grant_site_admin',r=>{grants.push(r.request().postDataJSON().p_email);return r.fulfill({json:{email:'friend@example.test'}});});
 await page.goto('/#profile/admin');await page.getByLabel('Administrator email',{exact:true}).fill('friend@example.test');await page.getByRole('button',{name:'Grant admin access',exact:true}).click();await expect(page.getByRole('status')).toContainText('Administrator access granted to friend@example.test');expect(grants).toEqual(['friend@example.test']);
 owner=false;await page.reload();await expect(page.getByRole('heading',{name:'Accounts',exact:true})).toBeVisible();await expect(page.getByLabel('Administrator email',{exact:true})).toHaveCount(0);
});

test('held piece stays visible through an opponent update and can be dropped',async({page})=>{
 const env=await connected(page);env.c.move('e4');env.room.state={...env.room.state,fen:env.c.fen(),moves:['e2e4'],notation:['e4'],positions:[env.c.fen()]};
 await page.goto('/#play/online/'+roomId);await expect.poll(()=>env.joins.length).toBeGreaterThan(0);
 const knight=page.getByRole('button',{name:'g1, white knight',exact:true}),target=page.getByRole('button',{name:'f3, empty',exact:true});
 const from=(await knight.boundingBox())!,to=(await target.boundingBox())!;
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2);
 await expect(page.locator('.drag-piece')).toBeVisible();
 await page.evaluate(()=>{(window as any).dragRemoved=false;new MutationObserver(records=>{for(const record of records)for(const node of record.removedNodes)if(node instanceof Element && (node.matches('.drag-piece')||node.querySelector('.drag-piece')))(window as any).dragRemoved=true;}).observe(document.body,{childList:true,subtree:true});});
 env.c.move('e5');env.emit('rooms',{...env.room,revision:2,state:{...env.room.state,fen:env.c.fen(),moves:['e2e4','e7e5'],notation:['e4','e5']}});
 await expect(page.getByRole('button',{name:'e5, black pawn',exact:true})).toBeVisible();await expect(page.locator('.drag-piece')).toBeVisible();expect(await page.evaluate(()=>(window as any).dragRemoved)).toBe(false);
 await page.mouse.up();await expect.poll(()=>env.actions.some(a=>a.move==='g1f3')).toBe(true);
});

test('online clocks align right, identities align left and actions sit in the right panel',async({page})=>{
 const env=await connected(page);env.room.members=[{id:uid,team:'b'},{id:peer,team:'w'}];env.room.state.clock={remaining:{w:180000,b:180000},startedAt:Date.now()};
 await page.goto('/#play/online/'+roomId);
 await expect(page.locator('.player-top')).toContainText('Opponent');await expect(page.locator('.player-bottom')).toContainText('Player');
 await expect(page.locator('.player-top').getByRole('timer',{name:'White clock',exact:true})).toBeVisible();await expect(page.locator('.player-bottom').getByRole('timer',{name:'Black clock',exact:true})).toBeVisible();
 const board=(await page.locator('.board').boundingBox())!,top=(await page.locator('.player-top').boundingBox())!,bottom=(await page.locator('.player-bottom').boundingBox())!,actions=(await page.getByRole('complementary',{name:'Game actions'}).boundingBox())!;
 const center=await page.evaluate(()=>document.documentElement.clientWidth/2);
 expect(Math.abs(board.x+board.width/2-center)).toBeLessThan(2);
 expect(Math.abs(actions.y-board.y)).toBeLessThan(2);
 expect(Math.abs(top.x-board.x)).toBeLessThan(2);expect(Math.abs(bottom.x-board.x)).toBeLessThan(2);expect(top.y+top.height).toBeLessThanOrEqual(board.y);expect(bottom.y).toBeGreaterThanOrEqual(board.y+board.height);expect(actions.x).toBeGreaterThanOrEqual(board.x+board.width);
 for (const strip of [page.locator('.player-top'), page.locator('.player-bottom')]) {
   const clock=(await strip.getByRole('timer').boundingBox())!,identity=(await strip.locator('.online-player-identity').boundingBox())!;
   expect(Math.abs(clock.x+clock.width-board.x-board.width)).toBeLessThan(2);
   expect(Math.abs(identity.x-board.x)).toBeLessThan(2);
 }
 await expect(page.getByRole('button',{name:'Invite friends',exact:true})).toHaveCount(0);
});

test('Variants stacks its friend control under the right-aligned opponent toggle', async ({ page }) => {
  await connected(page);
  await page.goto('/#variants');
  const hub = page.locator('.variants-hub');
  const opponent = hub.locator('.play-opponent-toggle');
  const friend = page.getByRole('button', { name: 'Play a Friend', exact: true });
  await page.getByRole('button', { name: 'Atomic', exact: true }).click();
  await expect(friend).toBeEnabled();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const [area, toggle, action] = (await Promise.all([
      hub.boundingBox(), opponent.boundingBox(), friend.boundingBox(),
    ])).map(box => box!);
    expect(Math.abs(area.x + area.width - toggle.x - toggle.width)).toBeLessThan(2);
    expect(action.y).toBeGreaterThan(toggle.y + toggle.height);
    expect(Math.abs(action.x + action.width - toggle.x - toggle.width)).toBeLessThan(2);
    const gallery = page.getByRole('group', { name: 'Online variants', exact: true });
    const galleryTop = () => gallery.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    const before = await galleryTop();
    await gallery.getByRole('button', { name: 'Team Chess', exact: true }).click();
    const team = page.getByRole('button', { name: 'Start Team Chess', exact: true });
    await expect(team).toBeVisible();
    const after = (await gallery.boundingBox())!;
    const launch = (await team.boundingBox())!;
    const teamSettings = (await hub.locator('.quick-online-play > .field').boundingBox())!;
    const teamToggle = (await opponent.boundingBox())!;
    expect(Math.abs(teamSettings.y-teamToggle.y)).toBeLessThan(1);
    expect(Math.abs(await galleryTop() - before)).toBeLessThan(1);
    expect(launch.y + launch.height).toBeLessThan(after.y);
    await gallery.getByRole('button', { name: 'Throne', exact: true }).click();
    await expect(friend).toHaveCount(0);
    expect(Math.abs(await galleryTop() - before)).toBeLessThan(1);
    await gallery.getByRole('button', { name: 'Atomic', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Speedrun', exact: true }).click();
  await expect(friend).toHaveCount(0);
  await expect(opponent).toBeVisible();
});

test('Play a Friend chooses an accepted friend and creates a reserved game without matchmaking',async({page})=>{
 const env=await connected(page);await page.route('**/rest/v1/rpc/player_directory',r=>r.fulfill({json:[{id:peer,screen_name:'Chess buddy',rating:1400,relationship:'friends',online:true}]}));await page.goto('/#play');const friendButton=page.getByRole('button',{name:'Play a Friend',exact:true}),start=page.getByRole('button',{name:'Start',exact:true});await expect(friendButton).toBeEnabled();await expect(start).toBeVisible();const f=(await friendButton.boundingBox())!,s=(await start.boundingBox())!;expect(f.y+f.height).toBeLessThan(s.y);await friendButton.click();await page.getByRole('dialog').getByRole('button',{name:/Chess buddy/}).click();await expect(page.getByRole('textbox',{name:'Selected friend',exact:true})).toHaveValue('Chess buddy');expect(env.actions).toHaveLength(0);await expect(page.locator('.play-hub-heading').getByRole('textbox',{name:'Selected friend',exact:true})).toBeVisible();await page.getByRole('button',{name:'Remove selected friend',exact:true}).click();await expect(friendButton).toBeVisible();await friendButton.click();await page.getByRole('dialog').getByRole('button',{name:/Chess buddy/}).click();await expect(page).toHaveURL(/#play$/);await page.getByRole('group',{name:'Time control',exact:true}).getByRole('button',{name:'5',exact:true}).click();await expect(page.getByRole('textbox',{name:'Selected friend',exact:true})).toHaveValue('Chess buddy');await start.click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'create',mode:'standard',variant:'chess',bot:false,friend:peer,timeControlSeconds:300});expect(env.requests.some(u=>u.pathname.endsWith('/room_lobby'))).toBe(false);
});

test('a pending Play a Friend request can be canceled from the left of the board',async({page})=>{
 const env=await connected(page);
 Object.assign(env.room,{host:uid,members:[{id:uid,team:'w'}],status:'waiting',settings:{bot:false,invitedFriend:peer}});
 await page.route('**/functions/v1/chess',async route=>{
  const body=route.request().postDataJSON();
  env.actions.push(body);
  await route.fulfill({json:{...env.room,status:'cancelled',revision:1}});
 });
 await page.goto('/#play/online/'+roomId);
 const cancel=page.getByRole('button',{name:'Cancel request',exact:true}),board=page.locator('.online-match .board');
 await expect(cancel).toBeVisible();
 for(const width of [1440,1100,390]){
  await page.setViewportSize({width,height:900});
  await expect.poll(async()=>{
   const [c,b]=await Promise.all([cancel.boundingBox(),board.boundingBox()]);
   return !!c&&!!b&&c.height>=56&&(width>1000?c.x+c.width<=b.x&&Math.abs(c.y-b.y)<2:c.y+c.height<=b.y);
  }).toBe(true);
 }
 await cancel.click();
 await expect(page).toHaveURL(/#play$/);
 expect(env.actions).toEqual([expect.objectContaining({action:'cancel_friend_request',room:roomId})]);
});

test('online win has a happy king, paired notation, review and outside-board dismissal',async({page})=>{
 const env=await connected(page);const initial=env.c.fen();env.c.move('e4');const afterWhite=env.c.fen();env.c.move('e5');
 env.room.status='finished';env.room.state={...env.room.state,initial,fen:env.c.fen(),moves:['e2e4','e7e5'],notation:['e4','e5'],positions:[initial,afterWhite,env.c.fen()],result:'1-0'};
 await page.goto('/#play/online/'+roomId);const message=page.locator('.game-result-banner');await expect(message.getByRole('img',{name:'Happy chess king'})).toBeVisible();await expect(message.getByRole('button',{name:'Game review',exact:true})).toBeVisible();
 const notation=page.getByRole('table',{name:'Game notation'});await expect(notation.getByRole('columnheader')).toHaveText(['Move','White','Black']);await expect(notation.locator('tbody tr').first().getByRole('cell')).toHaveText(['e4','e5']);
 await message.getByText('You won!',{exact:true}).click();await expect(message).toBeVisible();
 const board=(await page.locator('.board').boundingBox())!;await page.mouse.click(board.x+8,board.y+8);await expect(message).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'Game review',exact:true}).click();await expect(page).toHaveURL(/#library\//);
 const game=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).games[0]);expect(game.moves).toEqual(['e2e4','e7e5']);expect(game.result).toBe('1-0');
});

test('Throne review opens the completed round after a reset',async({page})=>{
 const env=await connected(page);const initial=env.c.fen();env.c.move('e4');const finished={...env.room.state,initial,fen:env.c.fen(),moves:['e2e4'],notation:['e4'],positions:[initial,env.c.fen()],result:'1-0'};
 env.room.mode='throne';env.room.state.lastGame={id:'finished-round',result:'1-0',white:uid,black:peer,reason:'resignation',resignedBy:peer,position:finished};
 await page.goto('/#variants/online/'+roomId);await page.getByRole('button',{name:'Game review',exact:true}).click();await expect(page).toHaveURL(/#library\//);
 const game=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).games[0]);expect(game.moves).toEqual(['e2e4']);expect(game.initial).toBe(initial);
});

test('human games show Offer draw beside Resign and allow accepting an opponent offer',async({page})=>{
 const env=await connected(page);
 await page.route('**/functions/v1/chess',async route=>{
   const action=route.request().postDataJSON();env.actions.push(action);
   if(action.action==='draw'){
     if(env.room.state.drawOffer==='b'){env.room.state.result='1/2-1/2';env.room.status='finished';delete env.room.state.drawOffer;}
     else env.room.state.drawOffer='w';
   }
   env.room.revision++;await route.fulfill({json:env.room});
 });
 await page.goto('/#play/online/'+roomId);
 const offer=page.getByRole('button',{name:'Offer draw',exact:true}),resign=page.getByRole('button',{name:'Resign',exact:true});
 const a=(await offer.boundingBox())!,b=(await resign.boundingBox())!;expect(Math.abs(a.y-b.y)).toBeLessThan(2);expect(a.x+a.width).toBeLessThanOrEqual(b.x);
 await offer.click();await expect(page.getByRole('button',{name:'Draw offered',exact:true})).toBeDisabled();expect(env.actions[0].action).toBe('draw');
 await expect.poll(()=>env.joins.length).toBeGreaterThan(0);
 env.room.state.drawOffer='b';env.room.revision++;env.emit('rooms',structuredClone(env.room));
 await expect(page.getByRole('button',{name:'Decline draw',exact:true})).toBeVisible();await page.getByRole('button',{name:'Accept draw',exact:true}).click();await expect(page.locator('.game-result-banner strong')).toHaveText('Draw');
});

test('admin accounts show recent online status and separate hash/reset actions',async({page})=>{
 await connected(page);await page.route('**/rest/v1/rpc/is_site_admin',r=>r.fulfill({json:true}));await page.route('**/rest/v1/rpc/is_site_owner',r=>r.fulfill({json:true}));
 await page.route('**/rest/v1/rpc/admin_accounts',r=>r.fulfill({json:{total:2,users:[{id:uid,screen_name:'Active player',email:'active@example.test'},{id:peer,screen_name:'Away player',email:'away@example.test'}]}}));
 await page.route('**/rest/v1/rpc/admin_online_accounts',r=>r.fulfill({json:[uid]}));
 await page.route('**/rest/v1/rpc/admin_presence_counts',r=>r.fulfill({json:{online:8,offline:43}}));
 const beat=page.waitForRequest(r=>r.url().endsWith('/rpc/account_heartbeat'));
 await page.goto('/#profile/admin');await beat;
 await expect(page.getByText('The account must already exist and have a confirmed email.',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Administrator email',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Administrator email',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Account activity totals',{exact:true}).locator('span')).toHaveText(['8 online','43 offline']);
 const active=page.getByRole('row').filter({hasText:'Active player'}),away=page.getByRole('row').filter({hasText:'Away player'});
 await expect(active.getByRole('img',{name:'Online',exact:true})).toHaveCSS('background-color','rgb(99, 220, 155)');
 await expect(away.getByRole('img',{name:'Offline',exact:true})).toHaveCSS('background-color','rgb(239, 119, 125)');
 const reset=(await active.getByRole('button',{name:'Send password reset to Active player'}).boundingBox())!,hash=(await active.getByRole('button',{name:'Show password hash for Active player'}).boundingBox())!;
 expect(hash.x-reset.x-reset.width).toBeGreaterThanOrEqual(19);
});

// Exercise each rule set through the same interactive queue and server update path.
import {variantList} from '../src/lib/variantCatalog';
import {onlineLegal,nativeVariant} from '../src/lib/onlineVariants';
import {premoveOptions,previewPremoves} from '../src/lib/premoves';
import {newSpecial,specialLegal,specialApply} from '../src/lib/specialRules';
for(const modeOrVariant of [...variantList.map(v=>v.id),'speedrun','throne','team','vote']) {
 const mode=['throne','team','vote'].includes(modeOrVariant)?modeOrVariant:'standard',variant=mode==='standard'?modeOrVariant:'chess';
 test(`premove executes after the opponent reply in ${modeOrVariant}`,async({page})=>{
  const env=await connected(page),ff=await native(),special=['dropping','chaos','random'].includes(variant);
  const getLegal=(state:any)=>special?specialLegal(state):onlineLegal(ff,variant,state);
  const apply=(state:any,move:string)=>special?{...specialApply(state,{type:'move',move}),initial:state.initial}:applyOnline(ff,variant,state,move);
  let state:any=special?newSpecial(variant as any,5):freshOnline(ff,variant);state.initial ||= state.fen;
  state=apply(state,getLegal(state)[0]);
  const reply=getLegal(state)[0],after=apply(state,reply),preview=previewPremoves(state.fen,[],'w',variant),options=premoveOptions(preview,'w',variant==='chaos',state.blocked||[],variant);
  let beforeDuck:Set<string>|undefined;
  if(variant==='duck'){const board=new ff.Board('duck',preview);try{beforeDuck=new Set(board.legalMoves().trim().split(/\s+/));}finally{board.delete();}}
  const move=getLegal(after).find((m:string)=>/^[a-h][1-8][a-h][1-8](?:,.*)?$/.test(m) && options.includes(m.split(',')[0]) && (!beforeDuck || beforeDuck.has(m)));
  expect(move,`queueable move for ${variant}`).toBeTruthy();
  env.room.mode=mode;env.room.variant=variant;env.room.state=state;
  await page.route('**/functions/v1/chess',async r=>{const body=r.request().postDataJSON();env.actions.push(body);env.room.state=apply(env.room.state,body.move);env.room.revision++;await r.fulfill({json:env.room});});
  await page.goto('/#variants/online/'+roomId);await expect.poll(()=>env.joins.length).toBeGreaterThan(0);
  if(variant==='blindtext'){const input=page.getByLabel('Blindfold move',{exact:true});await expect(input).toBeEnabled();await input.fill(move!);await input.press('Enter');}
  else{const board=page.locator('.chess-layout .board').first();for(const square of [move!.slice(0,2),move!.slice(2,4),...(variant==='duck'?[move!.slice(-2)]:[])])await board.getByRole('button',{name:new RegExp('^'+square+',')}).click();}
  await expect(page.locator('.queued-moves')).toBeVisible();expect(env.actions).toHaveLength(0);
  env.room.state=after;env.room.revision++;env.emit('rooms',structuredClone(env.room));
  await expect.poll(()=>env.actions.some(a=>a.move===move)).toBe(true);await expect(page.locator('.queued-moves')).toHaveCount(0);
 });
}

test('daily puzzle chat loads and sends only messages for the selected daily puzzle',async({page})=>{
 const env=await connected(page);let sent:any;
 await page.route('**/rest/v1/puzzle_messages?*',route=>{const key=new URL(route.request().url()).searchParams.get('puzzle_key')!.slice(3);return route.fulfill({json:[{id:1,puzzle_key:key,user_id:peer,body:'Nice daily puzzle',created_at:new Date().toISOString()}]});});
 await page.route('**/rest/v1/rpc/post_puzzle_message',async route=>{sent=route.request().postDataJSON();await route.fulfill({json:{id:2,puzzle_key:sent.p_puzzle,user_id:uid,body:sent.p_body,created_at:new Date().toISOString()}});});
 await page.goto('/#puzzles/daily');const log=page.getByRole('log',{name:'Daily puzzle chat',exact:true});await expect(log).toContainText('Nice daily puzzle');await expect(log).toContainText('Opponent');
 await page.getByLabel('Puzzle chat message',{exact:true}).fill('Good luck everyone');await page.getByRole('button',{name:'Send puzzle message',exact:true}).click();await expect(log).toContainText('Good luck everyone');expect(sent.p_puzzle).toMatch(/^\d{4}-\d{2}-\d{2}\//);expect(env.requests.some(url=>url.pathname.endsWith('/room_messages'))).toBe(false);
});

test('Players directory searches, sends requests, accepts incoming requests and removes friends',async({page})=>{
 await connected(page);let relationship='none';const queries:any[]=[],actions:any[]=[];
 await page.route('**/rest/v1/rpc/player_directory',async r=>{const body=r.request().postDataJSON();queries.push(body);const player={id:peer,screen_name:'Friendly Knight',rating:1450,country:'CA',online:true,relationship};await r.fulfill({json:body.p_section==='everyone'?[player]:body.p_section==='requests'?relationship==='incoming'?[player]:[]:relationship==='friends'?[player]:[]});});
 await page.route('**/rest/v1/rpc/friend_action',async r=>{const body=r.request().postDataJSON();actions.push(body);relationship=body.p_action==='send'?'outgoing':body.p_action==='accept'?'friends':'none';await r.fulfill({json:null});});
 await page.goto('/#players');await page.getByRole('button',{name:'Everyone',exact:true}).click();await page.getByLabel('Search players',{exact:true}).fill('Knight');await expect.poll(()=>queries.some(q=>q.p_query==='Knight')).toBe(true);
 await page.getByRole('button',{name:'Add friend',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel request',exact:true})).toBeVisible();expect(actions[0]).toEqual({p_player:peer,p_action:'send'});
 relationship='incoming';await page.reload();await page.getByRole('button',{name:'Accept',exact:true}).click();await expect(page.getByRole('button',{name:'Remove friend',exact:true})).toBeVisible();await page.getByRole('button',{name:'Remove friend',exact:true}).click();await expect(page.getByText('No friends yet. Find someone in Everyone to send a request.',{exact:true})).toBeVisible();
});
test('game invitations can be accepted from another page',async({page})=>{
 const env=await connected(page);let pending=true;await page.route('**/rest/v1/rpc/friend_game_invitations',r=>r.fulfill({json:pending?[{id:'invite-test',room_id:roomId,screen_name:'Chess buddy',name:'Friendly game',variant:'chess',time_control:180}]:[]}));await page.route('**/rest/v1/rpc/respond_friend_game',async r=>{expect(r.request().postDataJSON()).toEqual({p_invite:'invite-test',p_accept:true});pending=false;await r.fulfill({json:null});});
 await page.goto('/#stats');await page.getByRole('button',{name:'Accept game',exact:true}).click();await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);expect(env.actions[0]).toMatchObject({action:'join',room:roomId});
});

test('Friends loads beyond fifty people without pagination controls',async({page})=>{
 await connected(page);const friends=Array.from({length:51},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+100).padStart(12,'0')}`,screen_name:`Friend ${i+1}`,rating:1200,relationship:'friends',online:i<2}));
 await page.route('**/rest/v1/rpc/player_directory',async r=>{const body=r.request().postDataJSON();await r.fulfill({json:body.p_section==='requests'?[]:friends.slice(body.p_page*50,body.p_page*50+50)});});
 await page.goto('/#players');await expect(page.getByRole('heading',{name:'Friend 51',exact:true})).toBeVisible();await expect(page.locator('.players-pagination')).toHaveCount(0);
 const online=page.getByRole('region',{name:'Online',exact:true}),offline=page.getByRole('region',{name:'Offline',exact:true});
 await expect(online.locator('.player-card').getByRole('heading')).toHaveText(['Friend 1','Friend 2']);
 await expect(offline.locator('.player-card')).toHaveCount(49);
 await expect(offline.locator('.player-card').getByRole('heading').last()).toHaveText('Friend 51');
 await page.getByRole('button',{name:'Everyone',exact:true}).click();await page.getByLabel('Search players',{exact:true}).fill('Friend');await expect(page.locator('.players-pagination')).toBeVisible();
 await page.goto('/#play');await page.getByRole('button',{name:'Play a Friend',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:/^Friend 51 /})).toBeVisible();await expect(dialog.getByRole('button',{name:'Previous',exact:true})).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Next',exact:true})).toHaveCount(0);
});

test('Players can challenge someone without adding them as a friend',async({page})=>{
 const env=await connected(page);
 await page.route('**/rest/v1/rpc/player_directory',async route=>{
  const {p_section}=route.request().postDataJSON();
  await route.fulfill({json:p_section==='everyone'?[{id:peer,screen_name:'Friendly Knight',rating:1450,relationship:'none',online:true}]:[]});
 });
 await page.goto('/#players');
 await page.getByRole('button',{name:'Everyone',exact:true}).click();
 await page.getByRole('searchbox',{name:'Search players'}).fill('Kn');
 const row=page.locator('.player-card').filter({hasText:'Friendly Knight'});
 await expect(row.getByRole('button',{name:'Add friend',exact:true})).toBeVisible();
 await row.getByRole('button',{name:'Play',exact:true}).click();
 await expect(page).toHaveURL(/#play\/online(?:\/|%2F)/);
 expect(env.actions).toEqual([expect.objectContaining({action:'create',mode:'standard',variant:'chess',friend:peer,timeControlSeconds:180})]);
});

test('Everyone waits for two search characters and hides results when cleared',async({page})=>{
 await connected(page);const queries:any[]=[];
 await page.route('**/rest/v1/rpc/player_directory',async r=>{const body=r.request().postDataJSON();queries.push(body);await r.fulfill({json:body.p_section==='everyone'?[{id:peer,screen_name:'Friendly Knight',rating:1450,relationship:'none',online:true}]:[]});});
 await page.goto('/#players');await page.getByRole('button',{name:'Everyone',exact:true}).click();const search=page.getByLabel('Search players',{exact:true});
 await expect(page.locator('.players-results-heading')).toHaveCount(0);await expect(page.locator('.players-page')).not.toContainText('Type at least');
 await expect(page.locator('.players-page').getByRole('heading',{name:'Players',exact:true})).toHaveCount(0);await expect(page.getByText('Search players',{exact:true})).toHaveCount(0);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});const toggle=page.getByRole('group',{name:'Player sections',exact:true});await expect.poll(async()=>{const b=(await toggle.boundingBox())!,area=(await page.locator('.players-page').boundingBox())!;return Math.abs(b.x+b.width/2-area.x-area.width/2);}).toBeLessThan(1);const box=(await search.boundingBox())!;expect(Math.abs(box.x+box.width/2-width/2)).toBeLessThan(1);expect((await toggle.boundingBox())!.height).toBeGreaterThan(60);}
 await page.setViewportSize({width:1440,height:1000});await search.fill('  K  ');await page.waitForTimeout(350);expect(queries.filter(q=>q.p_section==='everyone')).toHaveLength(0);await expect(page.locator('.player-card')).toHaveCount(0);await expect(page.locator('.players-pagination')).toHaveCount(0);
 await search.fill('  Kn  ');await expect(page.getByRole('heading',{name:'Friendly Knight',exact:true})).toBeVisible();expect(queries.some(q=>q.p_section==='everyone'&&q.p_query==='Kn')).toBe(true);
 await search.fill('K');await expect(page.locator('.player-card')).toHaveCount(0);await expect(page.locator('.players-pagination')).toHaveCount(0);await search.clear();await expect(page.locator('.players-results-heading')).toHaveCount(0);await expect(page.locator('.players-page')).not.toContainText('Type at least');
});
