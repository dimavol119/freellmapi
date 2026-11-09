const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {DatabaseSync}=require('node:sqlite');const ts=require('../node_modules/typescript');
// Tests never reach the network: any test that needs email or OAuth installs its own fetch mock.
global.fetch=async url=>{throw Error('NETWORK_DISABLED_IN_TESTS '+url)};
const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/account-api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const loaded={exports:{}};new Function('exports','module','require',js)(loaded.exports,loaded,require);const {handleAccountApi}=loaded.exports;
function bindings(){const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle/0000_slippery_ghost_rider.sql'),'utf8').replaceAll('--> statement-breakpoint',''));for(const f of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0000')))sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle',f),'utf8').replaceAll('--> statement-breakpoint',''));const objects=new Map();const DB={async batch(statements){sql.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}},prepare(query){let args=[];return {bind(...v){args=v;return this},async first(){return sql.prepare(query).get(...args)||null},async run(){return sql.prepare(query).run(...args)}}}};const BUCKET={async put(k,v){objects.set(k,v)},async get(k){return objects.has(k)?{json:async()=>JSON.parse(objects.get(k))}:null},async delete(k){for(const key of Array.isArray(k)?k:[k])objects.delete(key)},async list({prefix='',cursor,limit=1000}={}){const keys=[...objects.keys()].filter(k=>k.startsWith(prefix));return {objects:keys.slice(0,limit).map(key=>({key})),truncated:false}}};return {DB,BUCKET,sql,objects}}
const req=(path,method='GET',data,cookie,origin)=>new Request('https://app.test/api/'+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{}),'CF-Connecting-IP':'127.0.0.1'},...(data?{body:JSON.stringify(data)}:{})});
async function signup(env,email){const response=await handleAccountApi(req('auth/register','POST',{email,password:'Long safe test passphrase!'}),env);assert.equal(response.status,200);const cookie=response.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);return {cookie,data:await response.json()}}
const note={id:'memory-1',title:'Private note',note:'Only mine',why:'Reason',intent:'Intent',topic:'אישי',location:'',due:'',birthday:'',images:[],done:false,notificationScheduled:false,createdAt:1};

test('previous versions recover deleted items, are private, and keep only three revisions',async()=>{
 const env=bindings(),a=await signup(env,'history@example.com'),b=await signup(env,'other-history@example.com');
 for(let revision=0;revision<6;revision++){const items=revision===4?[]:[{...note,title:'revision-'+(revision+1)}];assert.equal((await handleAccountApi(req('memories','PUT',{items,revision},a.cookie),env)).status,200)}
 const versions=await (await handleAccountApi(req('backups','GET',undefined,a.cookie),env)).json();assert.deepEqual(versions.versions,[5,4,3]);
 const old=await (await handleAccountApi(req('backups/4','GET',undefined,a.cookie),env)).json();assert.equal(old.items[0].title,'revision-4');
 assert.equal((await handleAccountApi(req('backups/4','GET',undefined,b.cookie),env)).status,404);
 assert.equal((await handleAccountApi(req('backups/4'),env)).status,401);
 assert.equal(env.objects.size,4);
 assert.equal((await handleAccountApi(req('account/delete','POST',{confirmEmail:'history@example.com'},a.cookie),env)).status,200);assert.equal(env.objects.size,0);
});
test('failure to back up previous data never overwrites the current workspace',async()=>{
 const env=bindings(),a=await signup(env,'safe@example.com');await handleAccountApi(req('memories','PUT',{items:[note],revision:0},a.cookie),env);
 const put=env.BUCKET.put;env.BUCKET.put=async(k,v)=>{if(k.includes('/history/'))throw Error('storage failure');return put(k,v)};
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[],revision:1},a.cookie),env)).status,500);
 const current=await (await handleAccountApi(req('memories','GET',undefined,a.cookie),env)).json();assert.equal(current.revision,1);assert.equal(current.items.length,1);
});

test('a stale browser tab cannot read, write, delete or log out the new account',async()=>{
 const env=bindings(),a=await signup(env,'tab-a@example.com'),b=await signup(env,'tab-b@example.com');
 for(const [path,method,data] of [['memories','GET'],['memories','PUT',{items:[note],revision:0}],['account/delete','POST',{confirmEmail:'tab-b@example.com'}],['auth/logout','POST',{}]]){
  const request=req(path,method,data,b.cookie);request.headers.set('X-Makom-User',a.data.user.id);
  const response=await handleAccountApi(request,env);assert.equal(response.status,409);assert.equal((await response.json()).error,'SESSION_CHANGED');
 }
 assert.equal(env.objects.size,0);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,2);
 const valid=req('memories','PUT',{items:[note],revision:0},b.cookie);valid.headers.set('X-Makom-User',b.data.user.id);assert.equal((await handleAccountApi(valid,env)).status,200);
});

test('duplicate and malformed registrations do not create additional accounts',async()=>{
 const env=bindings();await signup(env,'case@example.com');
 const duplicate=await handleAccountApi(req('auth/register','POST',{email:' CASE@example.com ',password:'Long safe test passphrase!'}),env);assert.equal(duplicate.status,409);
 for(const [email,password] of [['bad','Long safe test passphrase!'],['new@example.com','short'],['new@example.com','x'.repeat(129)]])assert.equal((await handleAccountApi(req('auth/register','POST',{email,password}),env)).status,400);
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,1);
});

test('failed older reset delivery does not delete a newer code',async()=>{
 const env=resetEnv();await signup(env,'race@example.com');const original=global.fetch;let releaseFirst,firstStarted;const started=new Promise(r=>firstStarted=r);let count=0,newCode;
 global.fetch=async(url,init)=>{count++;if(count===1){firstStarted();return new Promise(r=>releaseFirst=()=>r(new Response('{}',{status:503})))}newCode=JSON.parse(init.body).text.match(/\d{8}/)[0];return new Response('{}')};
 try{const first=handleAccountApi(req('auth/forgot','POST',{email:'race@example.com'}),env);await started;await handleAccountApi(req('auth/forgot','POST',{email:'race@example.com'}),env);releaseFirst();await first;assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'race@example.com',code:newCode,password:'New password for race!'}),env)).status,200)}finally{global.fetch=original}
});
test('registration creates independent accounts and hashes passwords',async()=>{const env=bindings();const first=await signup(env,'FIRST@example.com'),second=await signup(env,'second@example.com');assert.notEqual(first.data.user.id,second.data.user.id);const account=env.sql.prepare('SELECT * FROM accounts WHERE email=?').get('first@example.com');assert.notEqual(account.password_hash,'Long safe test passphrase!');assert.equal(account.password_hash.length,64);assert.equal((await handleAccountApi(req('auth/session','GET',undefined,first.cookie),env)).status,200)});
test('workspace reads and writes require a session',async()=>{const env=bindings();assert.equal((await handleAccountApi(req('memories'),env)).status,401);assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0}),env)).status,401)});
test('one account cannot read another account items, and stale writes are rejected',async()=>{const env=bindings();const a=await signup(env,'a@example.com'),b=await signup(env,'b@example.com');let response=await handleAccountApi(req('memories','PUT',{items:[note],revision:0},a.cookie),env);assert.equal(response.status,200);let result=await (await handleAccountApi(req('memories','GET',undefined,a.cookie),env)).json();assert.equal(result.items[0].title,'Private note');assert.equal(result.revision,1);result=await (await handleAccountApi(req('memories','GET',undefined,b.cookie),env)).json();assert.deepEqual(result.items,[]);response=await handleAccountApi(req('memories','PUT',{items:[],revision:0},a.cookie),env);assert.equal(response.status,409);assert.equal(env.objects.size,1)});
test('login rejects wrong passwords and logout invalidates the session',async()=>{const env=bindings();const a=await signup(env,'a@example.com');assert.equal((await handleAccountApi(req('auth/login','POST',{email:'a@example.com',password:'This password is wrong'}),env)).status,401);assert.equal((await handleAccountApi(req('auth/logout','POST',{},a.cookie),env)).status,200);assert.equal((await handleAccountApi(req('memories','GET',undefined,a.cookie),env)).status,401)});
test('cross-origin writes are denied',async()=>{const env=bindings();assert.equal((await handleAccountApi(req('auth/register','POST',{email:'a@example.com',password:'Long safe test passphrase!'},undefined,'https://evil.test'),env)).status,403)});
test('malformed data is rejected before overwriting a workspace',async()=>{const env=bindings();const a=await signup(env,'a@example.com');assert.equal((await handleAccountApi(req('memories','PUT',{items:[{id:'bad'}],revision:0},a.cookie),env)).status,400);assert.equal(env.objects.size,0)});
test('AI stays disabled regardless of authentication or any configured key',async()=>{const env=bindings();const response=await handleAccountApi(req('assistant','POST',{question:'test'}),env);assert.equal(response.status,503);assert.equal((await response.json()).error,'AI_DISABLED')});
const facebookEnv=()=>({...bindings(),FACEBOOK_LOGIN_ENABLED:'true',FACEBOOK_APP_ID:'12345',FACEBOOK_APP_SECRET:'test-only-secret',FACEBOOK_GRAPH_VERSION:'v25.0',FACEBOOK_SITE_ORIGIN:'https://makom-lizkor-dima.dimavol11.chatgpt.site'});
const fbRequest=(path,cookie)=>new Request('https://makom-lizkor-dima.dimavol11.chatgpt.site/api/auth/facebook/'+path,{headers:{...(cookie?{Cookie:cookie}:{})}});
async function startFacebook(env,cookie){const r=await handleAccountApi(fbRequest('start',cookie),env);assert.equal(r.status,303);const target=new URL(r.headers.get('Location'));assert.equal(target.origin,'https://www.facebook.com');assert.equal(target.searchParams.get('scope'),'public_profile,email');return {state:target.searchParams.get('state'),cookie:r.headers.get('Set-Cookie').split(';')[0]}}
test('Facebook is explicitly disabled until configured',async()=>{const env=bindings();assert.deepEqual(await (await handleAccountApi(fbRequest('status'),env)).json(),{enabled:false});assert.equal((await handleAccountApi(fbRequest('start'),env)).status,503)});
test('Facebook rejects missing state and consumes cancellation state once',async()=>{const env=facebookEnv();const started=await startFacebook(env);let r=await handleAccountApi(fbRequest('callback?code=fake'),env);assert.match(r.headers.get('Location'),/invalid_state/);r=await handleAccountApi(fbRequest('callback?state='+started.state+'&error=access_denied',started.cookie),env);assert.match(r.headers.get('Location'),/cancelled/);r=await handleAccountApi(fbRequest('callback?state='+started.state+'&code=fake',started.cookie),env);assert.match(r.headers.get('Location'),/expired/)});
test('Facebook callbacks create private accounts, reuse identities and refuse auto-linking by email',async()=>{const originalFetch=global.fetch;let profile={id:'888',email:'fb@example.com'};global.fetch=async(url)=>new Response(JSON.stringify(String(url).includes('/oauth/access_token')?{access_token:'test-token'}:profile));try{const env=facebookEnv();let start=await startFacebook(env);let r=await handleAccountApi(fbRequest('callback?state='+start.state+'&code=valid',start.cookie),env);assert.match(r.headers.get('Location'),/success/);assert.equal(env.sql.prepare('SELECT count(*) n FROM facebook_identities').get().n,1);assert.match(r.headers.get('Set-Cookie'),/makom_session=/);start=await startFacebook(env);r=await handleAccountApi(fbRequest('callback?state='+start.state+'&code=valid',start.cookie),env);assert.match(r.headers.get('Location'),/success/);assert.equal(env.sql.prepare('SELECT count(*) n FROM accounts').get().n,1);profile={id:'999',email:'fb@example.com'};start=await startFacebook(env);r=await handleAccountApi(fbRequest('callback?state='+start.state+'&code=valid',start.cookie),env);assert.match(r.headers.get('Location'),/sign_in_to_link/);assert.equal(env.sql.prepare('SELECT count(*) n FROM facebook_identities').get().n,1)}finally{global.fetch=originalFetch}});
test('Facebook linking requires unchanged existing account session',async()=>{const env=facebookEnv(),a=await signup(env,'existing@example.com'),start=await startFacebook(env,a.cookie);const r=await handleAccountApi(fbRequest('callback?state='+start.state+'&code=valid',start.cookie),env);assert.match(r.headers.get('Location'),/session_changed/)});
const googleEnv=()=>({...bindings(),GOOGLE_LOGIN_ENABLED:'true',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-only',GOOGLE_SITE_ORIGIN:'https://makom-lizkor-dima.dimavol11.chatgpt.site'});
const googleRequest=(path,cookie)=>new Request('https://makom-lizkor-dima.dimavol11.chatgpt.site/api/auth/google/'+path,{headers:{...(cookie?{Cookie:cookie}:{})}});
async function startGoogle(env,cookie){const r=await handleAccountApi(googleRequest('start',cookie),env);assert.equal(r.status,303);const target=new URL(r.headers.get('Location'));assert.equal(target.origin,'https://accounts.google.com');assert.equal(target.searchParams.get('scope'),'openid email');assert.equal(target.searchParams.get('code_challenge_method'),'S256');return {state:target.searchParams.get('state'),nonce:target.searchParams.get('nonce'),challenge:target.searchParams.get('code_challenge'),cookie:r.headers.get('Set-Cookie').split(';')[0]}}
test('Google stays disabled without owner configuration',async()=>{const env=bindings();assert.deepEqual(await (await handleAccountApi(googleRequest('status'),env)).json(),{enabled:false});assert.equal((await handleAccountApi(googleRequest('start'),env)).status,503)});
test('Google checks browser state and prevents callback replay',async()=>{const env=googleEnv(),start=await startGoogle(env);let r=await handleAccountApi(googleRequest('callback?state='+start.state+'&code=test'),env);assert.match(r.headers.get('Location'),/invalid_state/);r=await handleAccountApi(googleRequest('callback?state='+start.state+'&error=access_denied',start.cookie),env);assert.match(r.headers.get('Location'),/cancelled/);r=await handleAccountApi(googleRequest('callback?state='+start.state+'&code=test',start.cookie),env);assert.match(r.headers.get('Location'),/expired/)});
test('Google ID token verifies signature, issuer, audience, expiry, nonce and verified email',async()=>{const {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT}=require('jose');const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='local';const keys=createLocalJWKSet({keys:[jwk]});const make=(overrides={},aud='test.apps.googleusercontent.com',issuer='https://accounts.google.com',exp='5m')=>new SignJWT({nonce:'nonce',email:'person@example.com',email_verified:true,...overrides}).setProtectedHeader({alg:'RS256',kid:'local'}).setSubject('google-user-1').setIssuer(issuer).setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey);const verify=loaded.exports.verifyGoogleIdentity;assert.equal((await verify(await make(),'test.apps.googleusercontent.com','nonce',keys)).email,'person@example.com');for(const token of [await make({nonce:'wrong'}),await make({email_verified:false}),await make({},'wrong'),await make({},undefined,'https://evil.test'),await make({},undefined,undefined,'-1s')])await assert.rejects(()=>verify(token,'test.apps.googleusercontent.com','nonce',keys));const valid=await make();await assert.rejects(()=>verify(valid.slice(0,-12)+'AAAAAAAAAAAA','test.apps.googleusercontent.com','nonce',keys))});
test('Google callback exchanges PKCE, creates one private account and does not link by email',async()=>{const {generateKeyPair,exportJWK,SignJWT}=require('jose');const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='integration-google';const env=googleEnv();let start=await startGoogle(env),subject='google-user',email='google@example.com';const originalFetch=global.fetch;global.fetch=async(url,options)=>{if(String(url).includes('/certs'))return new Response(JSON.stringify({keys:[jwk]}),{headers:{'Content-Type':'application/json'}});assert.equal(String(url),'https://oauth2.googleapis.com/token');assert.equal(options.method,'POST');const verifier=options.body.get('code_verifier');const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');assert.equal(challenge,start.challenge);const token=await new SignJWT({email,email_verified:true,nonce:start.nonce}).setSubject(subject).setIssuer('https://accounts.google.com').setAudience(env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').setProtectedHeader({alg:'RS256',kid:jwk.kid}).sign(privateKey);return new Response(JSON.stringify({id_token:token}))};try{let r=await handleAccountApi(googleRequest('callback?state='+start.state+'&code=test',start.cookie),env);assert.match(r.headers.get('Location'),/success/);assert.match(r.headers.get('Set-Cookie'),/HttpOnly/);const firstId=env.sql.prepare('SELECT user_id FROM google_identities').get().user_id;start=await startGoogle(env);r=await handleAccountApi(googleRequest('callback?state='+start.state+'&code=test',start.cookie),env);assert.match(r.headers.get('Location'),/success/);assert.equal(env.sql.prepare('SELECT count(*) n FROM accounts').get().n,1);subject='other-user';start=await startGoogle(env);r=await handleAccountApi(googleRequest('callback?state='+start.state+'&code=test',start.cookie),env);assert.match(r.headers.get('Location'),/sign_in_to_link/);assert.equal(env.sql.prepare('SELECT user_id FROM google_identities').get().user_id,firstId)}finally{global.fetch=originalFetch}});
test('account deletion removes the account, sessions and stored items, and leaves other accounts alone',async()=>{const env=bindings();const a=await signup(env,'gone@example.com'),b=await signup(env,'stay@example.com');for(const who of [a,b]){const r=await handleAccountApi(req('memories','PUT',{items:[note],revision:0},who.cookie),env);assert.equal(r.status,200)}assert.equal(env.objects.size,2);
 let r=await handleAccountApi(req('account/delete','POST',{confirmEmail:'wrong@example.com'},a.cookie),env);assert.equal(r.status,400);assert.equal(env.sql.prepare('SELECT COUNT(*) c FROM accounts').get().c,2);
 r=await handleAccountApi(req('account/delete','POST',{confirmEmail:'GONE@example.com'}),env);assert.equal(r.status,401);
 r=await handleAccountApi(req('account/delete','POST',{confirmEmail:' GONE@example.com '},a.cookie,'https://evil.test'),env);assert.equal(r.status,403);
 r=await handleAccountApi(req('account/delete','POST',{confirmEmail:' GONE@example.com '},a.cookie),env);assert.equal(r.status,200);assert.match(r.headers.get('Set-Cookie'),/Max-Age=0/);
 assert.equal(env.sql.prepare('SELECT COUNT(*) c FROM accounts WHERE email=?').get('gone@example.com').c,0);assert.equal(env.sql.prepare('SELECT COUNT(*) c FROM sessions').get().c,1);assert.equal(env.objects.size,1);
 assert.equal((await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env)).status,200);assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env)).json()).user,null);
 assert.equal((await handleAccountApi(req('memories','GET',undefined,b.cookie),env)).status,200)});
test('expired sessions and rate-limit rows are purged on sign-in',async()=>{const env=bindings();await signup(env,'p@example.com');const uid=env.sql.prepare('SELECT id FROM accounts').get().id;env.sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run('old',uid,1);env.sql.prepare('INSERT INTO rate_limits(key,attempts,expires_at) VALUES (?,?,?)').run('old:1',1,1);const real=Math.random;Math.random=()=>0;try{await handleAccountApi(req('auth/login','POST',{email:'p@example.com',password:'Long safe test passphrase!'}),env)}finally{Math.random=real}assert.equal(env.sql.prepare("SELECT COUNT(*) c FROM sessions WHERE token_hash='old'").get().c,0);assert.equal(env.sql.prepare("SELECT COUNT(*) c FROM rate_limits WHERE key='old:1'").get().c,0)});

function resetEnv(){return {...bindings(),PASSWORD_RESET_ENABLED:'true',RESEND_API_KEY:'test-key',RESET_FROM_EMAIL:'Makom <noreply@example.com>'}}
async function withMail(fn){const sent=[];const real=globalThis.fetch;globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(init.headers.Authorization,'Bearer test-key');const body=JSON.parse(init.body);sent.push({to:body.to[0],code:body.text.match(/\d{8}/)[0]});return new Response('{}',{status:200})};try{await fn(sent)}finally{globalThis.fetch=real}}
test('password reset is unavailable until the owner configures email',async()=>{const env=bindings();assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'a@example.com'}),env)).status,503);assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'a@example.com',code:'12345678',password:'A new long passphrase!'}),env)).status,503)});
test('password reset emails a one-time code, replaces the password and ends old sessions',async()=>{const env=resetEnv();const old=await signup(env,'reset@example.com');await withMail(async sent=>{let r=await handleAccountApi(req('auth/forgot','POST',{email:'nobody@example.com'}),env);assert.equal(r.status,200);assert.equal(sent.length,0);
 r=await handleAccountApi(req('auth/forgot','POST',{email:' RESET@example.com '}),env);assert.equal(r.status,200);assert.equal(sent.length,1);assert.equal(sent[0].to,'reset@example.com');const code=sent[0].code;
 const wrong=code==='00000000'?'11111111':'00000000';r=await handleAccountApi(req('auth/reset','POST',{email:'reset@example.com',code:wrong,password:'A new long passphrase!'}),env);assert.equal(r.status,400);assert.equal((await r.json()).error,'INVALID_CODE');
 r=await handleAccountApi(req('auth/reset','POST',{email:'reset@example.com',code,password:'short'}),env);assert.equal(r.status,400);
 r=await handleAccountApi(req('auth/reset','POST',{email:'reset@example.com',code,password:'A new long passphrase!'}),env);assert.equal(r.status,200);
 assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,old.cookie),env)).json()).user,null);
 assert.equal((await handleAccountApi(req('auth/login','POST',{email:'reset@example.com',password:'Long safe test passphrase!'}),env)).status,401);
 assert.equal((await handleAccountApi(req('auth/login','POST',{email:'reset@example.com',password:'A new long passphrase!'}),env)).status,200);
 r=await handleAccountApi(req('auth/reset','POST',{email:'reset@example.com',code,password:'Another long passphrase!'}),env);assert.equal(r.status,400)})});
test('password reset locks a code after five wrong guesses and limits requests',async()=>{const env=resetEnv();await signup(env,'lock@example.com');await withMail(async sent=>{await handleAccountApi(req('auth/forgot','POST',{email:'lock@example.com'}),env);const code=sent[0].code,wrong=code==='00000000'?'11111111':'00000000';
 for(let i=0;i<5;i++)assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'lock@example.com',code:wrong,password:'A new long passphrase!'}),env)).status,400);
 assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'lock@example.com',code,password:'A new long passphrase!'}),env)).status,400);
 assert.equal((await handleAccountApi(req('auth/login','POST',{email:'lock@example.com',password:'Long safe test passphrase!'}),env)).status,200);
 await handleAccountApi(req('auth/forgot','POST',{email:'lock@example.com'}),env);await handleAccountApi(req('auth/forgot','POST',{email:'lock@example.com'}),env);
 assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'lock@example.com'}),env)).status,429)})});

test('simultaneous resets cannot reuse the same code',async()=>{const env=resetEnv();await signup(env,'concurrent@example.com');await withMail(async sent=>{await handleAccountApi(req('auth/forgot','POST',{email:'concurrent@example.com'}),env);const code=sent[0].code;const responses=await Promise.all([handleAccountApi(req('auth/reset','POST',{email:'concurrent@example.com',code,password:'First replacement passphrase!'}),env),handleAccountApi(req('auth/reset','POST',{email:'concurrent@example.com',code,password:'Second replacement passphrase!'}),env)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400])})});

test('Brevo sends the reset code only to the requesting account, without CC or BCC',async()=>{const env={...bindings(),PASSWORD_RESET_ENABLED:'true',PASSWORD_RESET_PROVIDER:'brevo',BREVO_API_KEY:'test-brevo-key',RESET_FROM_EMAIL:'sender@example.com'};await signup(env,'recipient@example.com');let code;const original=global.fetch;global.fetch=async(url,init)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(init.headers['api-key'],'test-brevo-key');const mail=JSON.parse(init.body);assert.deepEqual(mail.sender,{name:'מקום לזכור',email:'sender@example.com'});assert.deepEqual(mail.to,[{email:'recipient@example.com'}]);assert.equal(mail.cc,undefined);assert.equal(mail.bcc,undefined);assert.equal(mail.replyTo,undefined);code=mail.textContent.match(/\d{8}/)[0];return new Response('{"messageId":"test"}',{status:201})};try{assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'recipient@example.com'}),env)).status,200);assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'recipient@example.com',code,password:'Replacement password only!'}),env)).status,200)}finally{global.fetch=original}});
test('Brevo reset stays unavailable without configuration and discards codes when sending fails',async()=>{const env={...bindings(),PASSWORD_RESET_PROVIDER:'brevo',BREVO_API_KEY:'test-brevo-key',RESET_FROM_EMAIL:'sender@example.com'};assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'recipient@example.com'}),env)).status,503);env.PASSWORD_RESET_ENABLED='true';const key=env.BREVO_API_KEY;delete env.BREVO_API_KEY;assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'recipient@example.com'}),env)).status,503);env.BREVO_API_KEY=key;await signup(env,'failure@example.com');const original=global.fetch;global.fetch=async()=>new Response('{}',{status:429});try{assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'failure@example.com'}),env)).status,200);assert.equal(env.sql.prepare('SELECT count(*) n FROM password_resets').get().n,0)}finally{global.fetch=original}});

test('an identical save keeps the revision and never pushes a real version out of history',async()=>{
 const env=bindings(),a=await signup(env,'noop@example.com');
 const put=async(items,revision)=>{const r=await handleAccountApi(req('memories','PUT',{items,revision},a.cookie),env);assert.equal(r.status,200);return (await r.json()).revision};
 assert.equal(await put([],0),0,'an empty first save creates nothing');
 let rev=await put([{...note,title:'v1'}],0);assert.equal(rev,1);
 rev=await put([{...note,title:'v2'}],rev);rev=await put([{...note,title:'v3'}],rev);assert.equal(rev,3);
 // e.g. the second save after a device schedules a reminder: same content once the device flag is stripped
 for(let i=0;i<4;i++)assert.equal(await put([{...note,title:'v3'}],rev),3);
 const versions=await (await handleAccountApi(req('backups','GET',undefined,a.cookie),env)).json();assert.deepEqual(versions.versions,[2,1]);
 const old=await (await handleAccountApi(req('backups/1','GET',undefined,a.cookie),env)).json();assert.equal(old.items[0].title,'v1');
 const current=await (await handleAccountApi(req('memories','GET',undefined,a.cookie),env)).json();assert.equal(current.revision,3);assert.equal(current.items[0].title,'v3');
});

test('a save racing another device gets CONFLICT (so the client merges) instead of a storage error',async()=>{
 const env=bindings(),a=await signup(env,'race@example.com');
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[{...note,title:'base'}],revision:0},a.cookie),env)).status,200);
 const originalGet=env.BUCKET.get;let raced=false;
 env.BUCKET.get=async k=>{if(!raced&&!k.includes('/history/')){raced=true;const other=await handleAccountApi(req('memories','PUT',{items:[{...note,title:'other device'}],revision:1},a.cookie),env);assert.equal(other.status,200)}return originalGet(k)};
 const slow=await handleAccountApi(req('memories','PUT',{items:[{...note,title:'this device'}],revision:1},a.cookie),env);
 env.BUCKET.get=originalGet;
 assert.equal(slow.status,409);assert.equal((await slow.json()).error,'CONFLICT');
 const current=await (await handleAccountApi(req('memories','GET',undefined,a.cookie),env)).json();assert.equal(current.revision,2);assert.equal(current.items[0].title,'other device');
 const old=await (await handleAccountApi(req('backups/1','GET',undefined,a.cookie),env)).json();assert.equal(old.items[0].title,'base');
});

test('a genuinely missing workspace still refuses to overwrite',async()=>{
 const env=bindings(),a=await signup(env,'missing@example.com');
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0},a.cookie),env)).status,200);
 for(const k of [...env.objects.keys()])env.objects.delete(k);
 const r=await handleAccountApi(req('memories','PUT',{items:[{...note,title:'new'}],revision:1},a.cookie),env);assert.equal(r.status,503);assert.equal(env.objects.size,0);
});

test('account deletion also removes objects written by a save that was in flight',async()=>{
 const env=bindings(),a=await signup(env,'gone@example.com'),b=await signup(env,'stays@example.com');
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0},a.cookie),env)).status,200);
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[{...note,title:'B'}],revision:0},b.cookie),env)).status,200);
 const originalBatch=env.DB.batch;let injected=false;
 env.DB.batch=async statements=>{if(!injected){injected=true;await env.BUCKET.put('users/'+a.data.user.id+'/late-write.json','[]')}return originalBatch(statements)};
 const r=await handleAccountApi(req('account/delete','POST',{confirmEmail:'gone@example.com'},a.cookie),env);env.DB.batch=originalBatch;
 assert.equal(r.status,200);
 assert.deepEqual([...env.objects.keys()].filter(k=>k.startsWith('users/'+a.data.user.id+'/')),[]);
 const other=await (await handleAccountApi(req('memories','GET',undefined,b.cookie),env)).json();assert.equal(other.items[0].title,'B');
});

test('registration and reset refuse trivially guessable passwords, sign-in does not',async()=>{
 const env=bindings();const {weakPassword}=loaded.exports;
 for(const bad of ['aaaaaaaaaaaa','abababababab','123456789012','098765432109','qwertyuiopas','abcdefghijklmnop','            ','   short    ','me@example.com'])assert.equal(weakPassword(bad,'me@example.com'),true,bad);
 for(const good of ['Long safe test passphrase!','סיסמה ארוכה וטובה 2026','correct horse battery','Пароль надёжный 42'])assert.equal(weakPassword(good,'me@example.com'),false,good);
 const r=await handleAccountApi(req('auth/register','POST',{email:'weak@example.com',password:'123456789012'}),env);assert.equal(r.status,400);assert.equal((await r.json()).error,'WEAK_PASSWORD');
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,0);
 // an existing account with an old weak password can still sign in
 await signup(env,'old@example.com');env.sql.prepare("UPDATE accounts SET password_hash='x' WHERE email='old@example.com'").run();
 const login=await handleAccountApi(req('auth/login','POST',{email:'old@example.com',password:'aaaaaaaaaaaa'}),env);assert.equal(login.status,401);
});

test('failed sign-ins are limited per account even when the IP changes, and other accounts are unaffected',async()=>{
 const env=bindings();await signup(env,'target@example.com');await signup(env,'neighbour@example.com');
 const attempt=(email,password,ip)=>handleAccountApi(new Request('https://app.test/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify({email,password})}),env);
 for(let i=0;i<10;i++)assert.equal((await attempt('target@example.com','wrong password number '+i,'10.0.0.'+i)).status,401);
 assert.equal((await attempt('target@example.com','Long safe test passphrase!','10.0.1.1')).status,429,'even the right password waits after 10 failures');
 assert.equal((await attempt('neighbour@example.com','Long safe test passphrase!','10.0.1.2')).status,200);
 env.sql.prepare("DELETE FROM rate_limits WHERE key LIKE 'login-fail:%'").run();
 assert.equal((await attempt('target@example.com','Long safe test passphrase!','10.0.1.3')).status,200,'after the window the owner signs in');
});

test('an active session is renewed instead of expiring after 30 days, at most once per half-period',async()=>{
 const env=bindings(),a=await signup(env,'renew@example.com');
 const first=await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env);assert.equal(first.headers.get('Set-Cookie'),null,'fresh sessions are not rewritten');
 const soon=Date.now()+5*86400000;env.sql.prepare('UPDATE sessions SET expires_at=?').run(soon);
 const r=await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env);assert.equal((await r.json()).user.email,'renew@example.com');
 const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/Max-Age=2592000/);assert.match(cookie,/HttpOnly/);assert.equal(cookie.split(';')[0],a.cookie.split(';')[0],'same token, no new session row');
 assert.ok(env.sql.prepare('SELECT expires_at e FROM sessions').get().e>Date.now()+29*86400000);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
 env.sql.prepare('UPDATE sessions SET expires_at=?').run(Date.now()-1);
 assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env)).json()).user,null,'an expired session is never revived');
});

test('weak-password attempts do not use up the hourly registration limit',async()=>{
 const env=bindings();
 for(let i=0;i<8;i++)assert.equal((await handleAccountApi(req('auth/register','POST',{email:'try'+i+'@example.com',password:'aaaaaaaaaaaa'}),env)).status,400);
 await signup(env,'finally@example.com');
});

test('signing in over another session ends the previous session token',async()=>{
 const env=bindings(),a=await signup(env,'first@example.com');await signup(env,'second@example.com');
 const before=env.sql.prepare('SELECT COUNT(*) n FROM sessions').get().n;
 const r=await handleAccountApi(req('auth/login','POST',{email:'second@example.com',password:'Long safe test passphrase!'},a.cookie),env);assert.equal(r.status,200);
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM sessions').get().n,before);
 assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,a.cookie),env)).json()).user,null,'the old cookie no longer opens the first account');
 const now=await (await handleAccountApi(req('auth/session','GET',undefined,r.headers.get('Set-Cookie')),env)).json();assert.equal(now.user.email,'second@example.com');
});

// ---- Email verification at registration ----
function mailEnv(){return {...bindings(),PASSWORD_RESET_ENABLED:'true',PASSWORD_RESET_PROVIDER:'brevo',BREVO_API_KEY:'test-brevo-key',RESET_FROM_EMAIL:'sender@example.com'}}
function mailbox(status=201){const sent=[];global.fetch=async(url,init)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');const mail=JSON.parse(init.body);assert.equal(mail.cc,undefined);assert.equal(mail.bcc,undefined);sent.push({to:mail.to.map(t=>t.email),subject:mail.subject,code:mail.textContent.match(/\d{8}/)[0]});return new Response('{}',{status})};return sent}
const verify=(env,cookie,code)=>handleAccountApi(req('account/verify','POST',{code},cookie),env);

test('a new account gets a code by email and cannot store anything until it verifies',async()=>{
 const env=mailEnv(),sent=mailbox();
 const r=await handleAccountApi(req('auth/register','POST',{email:'New.Person@example.com',password:'Long safe test passphrase!'}),env);assert.equal(r.status,200);
 const cookie=r.headers.get('Set-Cookie'),user=(await r.json()).user;
 assert.equal(user.verificationRequired,true);assert.equal(user.emailVerified,false);assert.equal(user.verificationSent,true);
 assert.equal(sent.length,1);assert.deepEqual(sent[0].to,['new.person@example.com']);assert.match(sent[0].subject,/אימות/);
 for(const [path,method,data] of [['memories','GET'],['memories','PUT',{items:[note],revision:0}],['backups','GET'],['backups/1','GET']]){const x=await handleAccountApi(req(path,method,data,cookie),env);assert.equal(x.status,403,path);assert.equal((await x.json()).error,'EMAIL_NOT_VERIFIED')}
 assert.equal(env.objects.size,0,'nothing stored before verification');
 assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,cookie),env)).json()).user.verificationRequired,true);
 assert.equal((await verify(env,cookie,'00000000')).status,400);
 const ok=await verify(env,cookie,sent[0].code);assert.equal(ok.status,200);const after=(await ok.json()).user;assert.equal(after.emailVerified,true);assert.equal(after.verificationRequired,false);
 assert.equal((await verify(env,cookie,sent[0].code)).status,400,'a code works once');
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0},cookie),env)).status,200);
 assert.equal((await (await handleAccountApi(req('auth/session','GET',undefined,cookie),env)).json()).user.emailVerified,true);
});

test('verification codes lock after five wrong guesses, can be resent, and belong to one account only',async()=>{
 const env=mailEnv(),sent=mailbox();
 const a=await signup(env,'locked@example.com'),b=await signup(env,'other-locked@example.com');
 const codeA=sent[0].code;
 assert.equal((await verify(env,b.cookie,codeA)).status,400,"B cannot use A's code");
 for(let i=0;i<5;i++)assert.equal((await verify(env,a.cookie,String(10000000+i))).status,400);
 assert.equal((await verify(env,a.cookie,codeA)).status,400,'locked after five wrong guesses');
 assert.equal((await handleAccountApi(req('account/verify/send','POST',{},a.cookie),env)).status,200);
 assert.deepEqual(sent.at(-1).to,['locked@example.com']);assert.equal((await verify(env,a.cookie,sent.at(-1).code)).status,200);
 for(let i=0;i<5;i++)await handleAccountApi(req('account/verify/send','POST',{},b.cookie),env);
 assert.equal((await handleAccountApi(req('account/verify/send','POST',{},b.cookie),env)).status,429,'resending is rate limited');
 const expired=env.sql.prepare("UPDATE email_verifications SET expires_at=1").run();assert.ok(expired);
 assert.equal((await verify(env,b.cookie,sent.at(-1).code)).status,400,'expired codes are refused');
});

test('a mistyped address can be fixed with the password before verifying, never after',async()=>{
 const env=mailEnv(),sent=mailbox();
 const a=await signup(env,'typo@gmial.com');await signup(env,'taken@example.com');
 const change=(email,password='Long safe test passphrase!')=>handleAccountApi(req('account/email','POST',{email,password},a.cookie),env);
 assert.equal((await change('typo@gmail.com','Wrong password for sure!')).status,401);
 assert.equal((await change('taken@example.com')).status,409);
 const r=await change(' Typo@Gmail.com ');assert.equal(r.status,200);const u=(await r.json()).user;assert.equal(u.email,'typo@gmail.com');assert.equal(u.verificationSent,true);
 assert.deepEqual(sent.at(-1).to,['typo@gmail.com']);
 assert.equal((await verify(env,a.cookie,sent[0].code)).status,400,'the code sent to the old address no longer works');
 assert.equal((await verify(env,a.cookie,sent.at(-1).code)).status,200);
 assert.equal((await handleAccountApi(req('auth/login','POST',{email:'typo@gmail.com',password:'Long safe test passphrase!'}),env)).status,200);
 assert.equal((await handleAccountApi(req('auth/login','POST',{email:'typo@gmial.com',password:'Long safe test passphrase!'}),env)).status,401);
 assert.equal((await change('another@example.com')).status,409,'a verified address cannot be changed this way');
});

test('registration still works when the email cannot be sent, and accounts are not blocked without email configured',async()=>{
 const env=mailEnv();mailbox(500);
 const r=await handleAccountApi(req('auth/register','POST',{email:'nomail@example.com',password:'Long safe test passphrase!'}),env);assert.equal(r.status,200);
 const user=(await r.json()).user;assert.equal(user.verificationSent,false);assert.equal(user.verificationRequired,true);
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM email_verifications').get().n,0,'an unsent code is discarded');
 assert.equal((await handleAccountApi(req('account/verify/send','POST',{},r.headers.get('Set-Cookie')),env)).status,502);
 const plain=bindings(),p=await signup(plain,'plain@example.com');
 assert.equal(p.data.user.verificationRequired,false);assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0},p.cookie),plain)).status,200);
 assert.equal((await handleAccountApi(req('account/verify/send','POST',{},p.cookie),plain)).status,503);
});

test('accounts from before verification keep working; a completed password reset verifies the address',async()=>{
 const env=mailEnv(),sent=mailbox();
 const old=await signup(env,'legacy@example.com');env.sql.prepare("UPDATE accounts SET email_verified_at=0 WHERE email='legacy@example.com'").run();
 const s=(await (await handleAccountApi(req('auth/session','GET',undefined,old.cookie),env)).json()).user;assert.equal(s.verificationRequired,false);assert.equal(s.emailVerified,false);
 assert.equal((await handleAccountApi(req('memories','PUT',{items:[note],revision:0},old.cookie),env)).status,200);
 assert.equal((await handleAccountApi(req('account/email','POST',{email:'x@example.com',password:'Long safe test passphrase!'},old.cookie),env)).status,409);
 const fresh=await signup(env,'resetter@example.com');
 assert.equal((await handleAccountApi(req('auth/forgot','POST',{email:'resetter@example.com'}),env)).status,200);
 assert.equal((await handleAccountApi(req('auth/reset','POST',{email:'resetter@example.com',code:sent.at(-1).code,password:'A brand new long passphrase'}),env)).status,200);
 const login=await handleAccountApi(req('auth/login','POST',{email:'resetter@example.com',password:'A brand new long passphrase'}),env);
 const u=(await login.json()).user;assert.equal(u.emailVerified,true);assert.equal(u.verificationRequired,false);assert.ok(fresh);
});

test('migration 0004 marks existing accounts as not requiring verification and deletion removes pending codes',async()=>{
 const sql=new DatabaseSync(':memory:');const files=fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')).sort();
 for(const f of files.filter(f=>f<'0004'))sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle',f),'utf8').replaceAll('--> statement-breakpoint',''));
 sql.prepare("INSERT INTO accounts(id,email,salt,password_hash,revision,created_at) VALUES ('u1','before@example.com','s','h',0,1)").run();
 for(const f of files.filter(f=>f>='0004'))sql.exec(fs.readFileSync(path.join(__dirname,'../drizzle',f),'utf8').replaceAll('--> statement-breakpoint',''));
 assert.equal(sql.prepare("SELECT email_verified_at v FROM accounts WHERE id='u1'").get().v,0);
 const env=mailEnv();mailbox();const a=await signup(env,'gone-verify@example.com');
 assert.equal((await handleAccountApi(req('account/delete','POST',{confirmEmail:'gone-verify@example.com'},a.cookie),env)).status,200,'an unverified account can delete itself');
 assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM email_verifications').get().n,0);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,0);
});

test('friends behind one shared mobile or home address can all register, and the per-address limit still exists',async()=>{
 const env=bindings();
 for(let i=0;i<15;i++)assert.equal((await handleAccountApi(req('auth/register','POST',{email:'friend'+i+'@example.com',password:'Long safe test passphrase!'}),env)).status,200,'friend '+i);
 let last;for(let i=15;i<25;i++)last=(await handleAccountApi(req('auth/register','POST',{email:'friend'+i+'@example.com',password:'Long safe test passphrase!'}),env)).status;
 assert.equal(last,429,'mass registration from one address is still stopped');
});
