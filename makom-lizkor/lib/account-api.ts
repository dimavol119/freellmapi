import {createRemoteJWKSet,jwtVerify} from 'jose';
type Bindings={GOOGLE_CLIENT_ID?:string;GOOGLE_CLIENT_SECRET?:string;GOOGLE_SITE_ORIGIN?:string;GOOGLE_LOGIN_ENABLED?:string;DB?:D1Database;BUCKET?:R2Bucket;FACEBOOK_APP_ID?:string;FACEBOOK_APP_SECRET?:string;FACEBOOK_GRAPH_VERSION?:string;FACEBOOK_SITE_ORIGIN?:string;FACEBOOK_LOGIN_ENABLED?:string;PASSWORD_RESET_ENABLED?:string;PASSWORD_RESET_PROVIDER?:string;BREVO_API_KEY?:string;RESEND_API_KEY?:string;RESET_FROM_EMAIL?:string};
type Account={id:string;email:string;salt:string;password_hash:string;workspace_key:string|null;revision:number;session_expires?:number;email_verified_at?:number|null};
const encoder=new TextEncoder();const LIMIT=20*1024*1024;
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function hash(value:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256))}
function same(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function json(data:unknown,status=200,cookie?:string){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}})}
const sessionCookie=(token:string,secure:boolean,maxAge=2592000)=>'makom_session='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+maxAge+(secure?'; Secure':'');
async function body(request:Request):Promise<Record<string,unknown>>{if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('TYPE');const raw=await request.text();if(encoder.encode(raw).byteLength>LIMIT)throw Error('SIZE');const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('BODY');return value}
async function rate(db:D1Database,key:string,limit:number,seconds=900){const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/seconds),id=key+':'+bucket;const result=await db.prepare('INSERT INTO rate_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,now+seconds).first<{attempts:number}>();return (result?.attempts||0)<=limit}
const RESET_TTL=900000;
const DAY=86400000,SESSION_TTL=30*DAY,SESSION_RENEW_BELOW=15*DAY,LOGIN_FAILURES=10,LOGIN_WINDOW=900;
/** Rejects passwords that are long enough but trivially guessable. Applies to new passwords only, never to sign-in. */
export function weakPassword(password:string,email:string){
 const lower=password.toLowerCase(),rows=['0123456789'.repeat(4),'9876543210'.repeat(4),'qwertyuiopasdfghjklzxcvbnm','abcdefghijklmnopqrstuvwxyz'];
 return password.trim().length<12||new Set(lower).size<5||lower.trim()===email||rows.some(r=>r.includes(lower));
}
async function loginFailures(db:D1Database,email:string){const now=Math.floor(Date.now()/1000);const row=await db.prepare('SELECT attempts FROM rate_limits WHERE key=?').bind('login-fail:'+await hash(email)+':'+Math.floor(now/LOGIN_WINDOW)).first<{attempts:number}>();return row?.attempts||0}
type ResetConfig={provider:'resend'|'brevo';key:string;from:string};
function resetConfig(b:Bindings):ResetConfig|null{
 if(b.PASSWORD_RESET_ENABLED!=='true'||!b.RESET_FROM_EMAIL||b.RESET_FROM_EMAIL.length>=200||! /^[^\r\n]+$/.test(b.RESET_FROM_EMAIL))return null;
 const provider=b.PASSWORD_RESET_PROVIDER||'resend';
 if(provider==='brevo')return b.BREVO_API_KEY&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(b.RESET_FROM_EMAIL)?{provider,key:b.BREVO_API_KEY,from:b.RESET_FROM_EMAIL}:null;
 return provider==='resend'&&b.RESEND_API_KEY?{provider,key:b.RESEND_API_KEY,from:b.RESET_FROM_EMAIL}:null;
}
const resetHash=(email:string,code:string)=>hash('reset:'+email+':'+code);
function resetCode(){return String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0')}
const VERIFY_TTL=1800000;
const verifyHash=(id:string,email:string,code:string)=>hash('verify:'+id+':'+email+':'+code);
/** email_verified_at: NULL = new account waiting for its code, 0 = created before verification existed (not required), >0 = verified. */
const verificationRequired=(account:Account,bindings:Bindings)=>account.email_verified_at===null&&!!resetConfig(bindings);
const userView=(account:Account,bindings:Bindings)=>({id:account.id,email:account.email,emailVerified:(account.email_verified_at||0)>0,verificationRequired:verificationRequired(account,bindings)});
async function sendVerification(db:D1Database,config:ResetConfig,account:{id:string;email:string}){
 const code=resetCode(),codeHash=await verifyHash(account.id,account.email,code);
 await db.prepare('INSERT INTO email_verifications(user_id,email,code_hash,attempts,expires_at) VALUES (?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at').bind(account.id,account.email,codeHash,Date.now()+VERIFY_TTL).run();
 const subject='קוד לאימות האימייל · מקום לזכור',text='קוד האימות שלך: '+code+'\nהקוד תקף ל־30 דקות. אם לא נרשמת למקום לזכור, אפשר להתעלם מהודעה זו.\n\nYour email verification code: '+code+' (valid for 30 minutes). If you did not sign up, ignore this email.';
 const sent=await sendEmail(config,account.email,subject,text).catch(()=>false);
 if(!sent){console.error('verification email failed');await db.prepare('DELETE FROM email_verifications WHERE user_id=? AND code_hash=?').bind(account.id,codeHash).run()}
 return sent;
}
async function sendEmail(config:ResetConfig,to:string,subject:string,text:string){
 const brevo=config.provider==='brevo';
 const r=await fetch(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',headers:brevo?{'api-key':config.key,'Content-Type':'application/json'}:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(brevo?{sender:{name:'מקום לזכור',email:config.from},to:[{email:to}],subject,textContent:text}:{from:config.from,to:[to],subject,text}),signal:AbortSignal.timeout(15000)});
 return r.ok;
}
async function sendResetEmail(config:ResetConfig,to:string,code:string){
 const subject='קוד לשחזור סיסמה · מקום לזכור',text='קוד השחזור שלך: '+code+'\nהקוד תקף ל־15 דקות. אם לא ביקשת לשחזר סיסמה, אפשר להתעלם מהודעה זו.\n\nYour password reset code: '+code+' (valid for 15 minutes). If you did not request this, ignore this email.';
 const brevo=config.provider==='brevo';
 const r=await fetch(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',headers:brevo?{'api-key':config.key,'Content-Type':'application/json'}:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(brevo?{sender:{name:'מקום לזכור',email:config.from},to:[{email:to}],subject,textContent:text}:{from:config.from,to:[to],subject,text}),signal:AbortSignal.timeout(15000)});
 return r.ok;
}
async function purgeExpired(db:D1Database){const ms=Date.now(),sec=Math.floor(ms/1000);await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at<?').bind(ms),db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(sec),db.prepare('DELETE FROM facebook_states WHERE expires_at<?').bind(ms),db.prepare('DELETE FROM google_states WHERE expires_at<?').bind(ms),db.prepare('DELETE FROM password_resets WHERE expires_at<?').bind(ms),db.prepare('DELETE FROM email_verifications WHERE expires_at<?').bind(ms)])}
async function deleteUserObjects(id:string,bucket:R2Bucket){
 const prefix='users/'+id+'/';let cursor:string|undefined;
 do{const page=await bucket.list({prefix,cursor,limit:500});if(page.objects.length)await bucket.delete(page.objects.map(o=>o.key));cursor=page.truncated?page.cursor:undefined}while(cursor);
}
async function revisionMoved(db:D1Database,account:Account){const row=await db.prepare('SELECT revision FROM accounts WHERE id=?').bind(account.id).first<{revision:number}>();return !row||row.revision!==account.revision}
async function deleteAccountData(account:Account,db:D1Database,bucket:R2Bucket){
 await deleteUserObjects(account.id,bucket);
 if(account.workspace_key)await bucket.delete(account.workspace_key);
 await db.batch([db.prepare('DELETE FROM sessions WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM facebook_states WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM google_states WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM facebook_identities WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM google_identities WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM rate_limits WHERE key LIKE ? OR key LIKE ?').bind('save:'+account.id+':%','delete:'+account.id+':%'),db.prepare('DELETE FROM password_resets WHERE email=?').bind(account.email),db.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(account.id),db.prepare('DELETE FROM accounts WHERE id=?').bind(account.id)]);
 // A save that was already in flight may have written after the first sweep. The account row is gone now, so no new
 // save can succeed; sweep once more so no copy of the deleted user's data stays behind.
 await deleteUserObjects(account.id,bucket).catch(()=>console.error('account cleanup sweep failed'));
}
async function authenticated(request:Request,db:D1Database){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)makom_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;return db.prepare('SELECT a.*,s.expires_at AS session_expires FROM accounts a JOIN sessions s ON s.user_id=a.id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),Date.now()).first<Account>()}
async function startSession(account:Account,db:D1Database,secure:boolean,request?:Request,view:Record<string,unknown>={id:account.id,email:account.email}){const token=random();
 // Signing in over another session in this browser ends that session, so its token does not stay valid in the database.
 const previous=request?.headers.get('Cookie')?.match(/(?:^|;\s*)makom_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(previous)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(previous)).run();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(token),account.id,Date.now()+SESSION_TTL).run();return json({user:view},200,sessionCookie(token,secure))}
const historyPrefix=(id:string)=>'users/'+id+'/history/';
const historyKey=(id:string,revision:number)=>historyPrefix(id)+String(revision).padStart(16,'0')+'.json';
async function historyVersions(bucket:R2Bucket,id:string){
 const objects: R2Object[]=[];let cursor:string|undefined;
 do{const page=await bucket.list({prefix:historyPrefix(id),cursor,limit:1000});objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);
 return objects.map(o=>({key:o.key,revision:Number(o.key.slice(historyPrefix(id).length).replace(/\.json$/,''))})).filter(o=>Number.isSafeInteger(o.revision)&&o.revision>0).sort((a,b)=>b.revision-a.revision);
}
function validItems(items:unknown):items is Record<string,unknown>[]{if(!Array.isArray(items)||items.length>2000)return false;const ids=new Set<string>();return items.every(i=>{if(!i||typeof i!=='object'||typeof i.id!=='string'||i.id.length>160||ids.has(i.id))return false;ids.add(i.id);return ['title','note','why','intent','topic','location','due','birthday'].every(k=>typeof i[k]==='string'&&i[k].length<30000)&&typeof i.createdAt==='number'&&Number.isFinite(i.createdAt)&&typeof i.done==='boolean'&&typeof i.notificationScheduled==='boolean'&&(i.reminderSound===undefined||typeof i.reminderSound==='boolean')&&(i.remindBeforeDays===undefined||i.remindBeforeDays===0||i.remindBeforeDays===1)&&Array.isArray(i.images)&&i.images.length<=30&&i.images.every((image:unknown)=>typeof image==='string'&&/^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,[a-zA-Z0-9+/=\r\n]+$/.test(image))})}
export async function handleAccountApi(request:Request,bindings:Bindings):Promise<Response>{
 const url=new URL(request.url),path=url.pathname,db=bindings.DB,bucket=bindings.BUCKET,secure=url.protocol==='https:';
 if(path==='/api/health')return json({accounts:!!db&&!!bucket,ai:false});
 if(path==='/api/assistant')return json({error:'AI_DISABLED'},503);
 if(!db||!bucket)return json({error:'SERVICE_UNAVAILABLE'},503);
 if(request.method!=='GET'){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'FORBIDDEN'},403);if(Number(request.headers.get('Content-Length')||0)>LIMIT)return json({error:'BACKUP_TOO_LARGE'},413)}
 try{
 if(path.startsWith('/api/auth/google/'))return await googleApi(request,bindings);
 if(path.startsWith('/api/auth/facebook/'))return await facebookApi(request,bindings);
 if(path==='/api/auth/register'||path==='/api/auth/login'){
  if(request.method!=='POST')return json({error:'METHOD'},405);
  if(Math.random()<0.05)await purgeExpired(db).catch(()=>{});
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';if(!await rate(db,'auth:'+await hash(ip),30))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const data=await body(request),email=typeof data.email==='string'?data.email.trim().toLowerCase():'',password=typeof data.password==='string'?data.password:'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return json({error:'INVALID_CREDENTIAL_FORMAT'},400);
  const existing=await db.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first<Account>();
  if(path.endsWith('register')){
   if(weakPassword(password,email))return json({error:'WEAK_PASSWORD'},400);
   if(!await rate(db,'signup:'+await hash(ip),5,3600))return json({error:'TOO_MANY_ATTEMPTS'},429);
   if(existing)return json({error:'EMAIL_IN_USE'},409);const salt=random(),id=crypto.randomUUID(),derived=await passwordHash(password,salt);
   try{await db.prepare('INSERT INTO accounts(id,email,salt,password_hash,revision,created_at,email_verified_at) VALUES (?,?,?,?,0,?,NULL)').bind(id,email,salt,derived,Date.now()).run()}catch(e){if(String(e).includes('UNIQUE'))return json({error:'EMAIL_IN_USE'},409);throw e}
   const created:Account={id,email,salt,password_hash:derived,workspace_key:null,revision:0,email_verified_at:null};
   // Registration succeeds even if the email cannot be sent right now; the user can ask for a new code.
   const config=resetConfig(bindings),verificationSent=config?await sendVerification(db,config,created):false;
   return await startSession(created,db,secure,request,{...userView(created,bindings),verificationSent});
  }
  // Per-account limit on failed sign-ins, in addition to the per-IP limit, so changing IP does not allow unlimited guessing.
  if(await loginFailures(db,email)>=LOGIN_FAILURES)return json({error:'TOO_MANY_ATTEMPTS'},429);
  const derived=await passwordHash(password,existing?.salt||'00000000000000000000000000000000');if(!existing||!same(derived,existing.password_hash)){await rate(db,'login-fail:'+await hash(email),LOGIN_FAILURES,LOGIN_WINDOW);return json({error:'INVALID_LOGIN'},401)}
  return await startSession(existing,db,secure,request,userView(existing,bindings));
 }
 if(path==='/api/auth/forgot'||path==='/api/auth/reset'){
  if(request.method!=='POST')return json({error:'METHOD'},405);
  const config=resetConfig(bindings);if(!config)return json({error:'RESET_UNAVAILABLE'},503);
  const ip=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
  const data=await body(request),email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json({error:'INVALID_CREDENTIAL_FORMAT'},400);
  if(path==='/api/auth/forgot'){
   if(!await rate(db,'forgot-ip:'+ip,10,3600)||!await rate(db,'forgot-mail:'+await hash(email),3,3600))return json({error:'TOO_MANY_ATTEMPTS'},429);
   const owner=await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first<{id:string}>();
   if(owner){const code=resetCode(),codeHash=await resetHash(email,code);await db.prepare('INSERT INTO password_resets(email,code_hash,attempts,expires_at) VALUES (?,?,0,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at').bind(email,codeHash,Date.now()+RESET_TTL).run();
    const sent=await sendResetEmail(config,email,code).catch(()=>false);if(!sent){console.error('password reset email failed');await db.prepare('DELETE FROM password_resets WHERE email=? AND code_hash=?').bind(email,codeHash).run()}}
   return json({ok:true});
  }
  if(!await rate(db,'reset-ip:'+ip,20))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const code=typeof data.code==='string'?data.code.trim():'',password=typeof data.password==='string'?data.password:'';
  if(!/^\d{8}$/.test(code)||password.length<12||password.length>128)return json({error:'INVALID_CREDENTIAL_FORMAT'},400);
  if(weakPassword(password,email))return json({error:'WEAK_PASSWORD'},400);
  const attempt=await db.prepare('UPDATE password_resets SET attempts=attempts+1 WHERE email=? AND expires_at>? RETURNING code_hash,attempts').bind(email,Date.now()).first<{code_hash:string;attempts:number}>();
  if(!attempt||attempt.attempts>5||!same(await resetHash(email,code),attempt.code_hash))return json({error:'INVALID_CODE'},400);
  const owner=await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first<{id:string}>();if(!owner)return json({error:'INVALID_CODE'},400);
  const salt=random(),derived=await passwordHash(password,salt);
  const consumed=await db.prepare('DELETE FROM password_resets WHERE email=? AND code_hash=? AND attempts<=5 AND expires_at>? RETURNING email').bind(email,attempt.code_hash,Date.now()).first<{email:string}>();
  if(!consumed)return json({error:'INVALID_CODE'},400);
  await db.batch([db.prepare('UPDATE accounts SET salt=?,password_hash=? WHERE id=?').bind(salt,derived,owner.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(owner.id),db.prepare('DELETE FROM password_resets WHERE email=?').bind(email),
   // A completed reset proves the person controls this address.
   db.prepare('UPDATE accounts SET email_verified_at=? WHERE id=? AND (email_verified_at IS NULL OR email_verified_at=0)').bind(Date.now(),owner.id),db.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(owner.id)]);
  return json({ok:true});
 }
 const account=await authenticated(request,db);
 if(path==='/api/auth/session'&&request.method==='GET'){
  // Sliding renewal: an active user is not signed out every 30 days. Renewed at most once per 15 days per session.
  const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)makom_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(account&&token&&typeof account.session_expires==='number'&&account.session_expires-Date.now()<SESSION_RENEW_BELOW){
   const renewed=await db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=? AND user_id=? RETURNING expires_at').bind(Date.now()+SESSION_TTL,await hash(token),account.id).first().catch(()=>null);
   if(renewed)return json({user:userView(account,bindings)},200,sessionCookie(token,secure));
  }
  return json({user:account?userView(account,bindings):null});
 }
 if(!account)return json({error:'SIGN_IN_REQUIRED'},401);
 // A cookie may change in another tab. Never apply the old tab's data to the new account.
 const expectedUser=request.headers.get('X-Makom-User');
 if(expectedUser&&expectedUser!==account.id)return json({error:'SESSION_CHANGED'},409);
 if(path==='/api/auth/logout'&&request.method==='POST'){const token=request.headers.get('Cookie')?.match(/makom_session=([a-f0-9]{64})/)?.[1];if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();return json({ok:true},200,sessionCookie('',secure,0))}
 if(path==='/api/account/verify/send'&&request.method==='POST'){
  const config=resetConfig(bindings);if(!config)return json({error:'VERIFY_UNAVAILABLE'},503);
  if((account.email_verified_at||0)>0)return json({ok:true,user:userView(account,bindings)});
  if(!await rate(db,'verify-send:'+account.id,5,3600))return json({error:'TOO_MANY_ATTEMPTS'},429);
  if(!await sendVerification(db,config,account))return json({error:'EMAIL_SEND_FAILED'},502);
  return json({ok:true});
 }
 if(path==='/api/account/verify'&&request.method==='POST'){
  if(!await rate(db,'verify-try:'+account.id,20))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const data=await body(request),code=typeof data.code==='string'?data.code.trim():'';
  if(!/^\d{8}$/.test(code))return json({error:'INVALID_CODE'},400);
  const attempt=await db.prepare('UPDATE email_verifications SET attempts=attempts+1 WHERE user_id=? AND expires_at>? RETURNING code_hash,attempts,email').bind(account.id,Date.now()).first<{code_hash:string;attempts:number;email:string}>();
  if(!attempt||attempt.attempts>5||attempt.email!==account.email||!same(await verifyHash(account.id,account.email,code),attempt.code_hash))return json({error:'INVALID_CODE'},400);
  const at=Date.now();
  await db.batch([db.prepare('UPDATE accounts SET email_verified_at=? WHERE id=? AND email=?').bind(at,account.id,account.email),db.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(account.id)]);
  return json({ok:true,user:userView({...account,email_verified_at:at},bindings)});
 }
 if(path==='/api/account/email'&&request.method==='POST'){
  // Only a new account that has not verified yet may fix a mistyped address; it must confirm its password.
  if(account.email_verified_at!==null)return json({error:'EMAIL_ALREADY_VERIFIED'},409);
  if(!await rate(db,'email-change:'+account.id,5,3600))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const data=await body(request),email=typeof data.email==='string'?data.email.trim().toLowerCase():'',password=typeof data.password==='string'?data.password:'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return json({error:'INVALID_CREDENTIAL_FORMAT'},400);
  if(!same(await passwordHash(password,account.salt),account.password_hash))return json({error:'INVALID_LOGIN'},401);
  if(email!==account.email){
   if(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first())return json({error:'EMAIL_IN_USE'},409);
   try{const changed=await db.prepare('UPDATE accounts SET email=? WHERE id=? AND email_verified_at IS NULL RETURNING id').bind(email,account.id).first();if(!changed)return json({error:'EMAIL_ALREADY_VERIFIED'},409)}catch(e){if(String(e).includes('UNIQUE'))return json({error:'EMAIL_IN_USE'},409);throw e}
   await db.batch([db.prepare('DELETE FROM password_resets WHERE email=?').bind(account.email),db.prepare('DELETE FROM email_verifications WHERE user_id=?').bind(account.id)]);
  }
  const updated={...account,email},config=resetConfig(bindings),verificationSent=config?await sendVerification(db,config,updated):false;
  return json({ok:true,user:{...userView(updated,bindings),verificationSent}});
 }
 if(path==='/api/account/delete'&&request.method==='POST'){
  if(!await rate(db,'delete:'+account.id,5))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const data=await body(request);
  if(typeof data.confirmEmail!=='string'||data.confirmEmail.trim().toLowerCase()!==account.email)return json({error:'CONFIRMATION_MISMATCH'},400);
  await deleteAccountData(account,db,bucket);
  return json({ok:true},200,sessionCookie('',secure,0));
 }
 // Until a new account confirms its email, it can only verify, fix the address, sign out or delete itself.
 if(verificationRequired(account,bindings))return json({error:'EMAIL_NOT_VERIFIED'},403);
 if(path==='/api/memories'&&request.method==='GET'){
  if(!account.workspace_key)return json({items:[],revision:account.revision});const object=await bucket.get(account.workspace_key);if(!object)return json({error:'STORAGE_UNAVAILABLE'},503);return json({items:await object.json(),revision:account.revision});
 }
 if(path==='/api/backups'&&request.method==='GET')return json({versions:(await historyVersions(bucket,account.id)).slice(0,3).map(v=>v.revision)});
 if(path.startsWith('/api/backups/')&&request.method==='GET'){
  const value=path.slice('/api/backups/'.length);if(!/^[1-9]\d{0,14}$/.test(value))return json({error:'NOT_FOUND'},404);
  const object=await bucket.get(historyKey(account.id,Number(value)));if(!object)return json({error:'NOT_FOUND'},404);
  const items=await object.json();if(!validItems(items))return json({error:'STORAGE_UNAVAILABLE'},503);
  return json({items,revision:Number(value)});
 }
 if(path==='/api/memories'&&request.method==='PUT'){
  if(!await rate(db,'save:'+account.id,120))return json({error:'TOO_MANY_ATTEMPTS'},429);const data=await body(request);
  if(!validItems(data.items)||typeof data.revision!=='number'||!Number.isSafeInteger(data.revision))return json({error:'INVALID_ITEMS'},400);
  if(data.revision!==account.revision)return json({error:'CONFLICT'},409);
  // Preserve the exact previous revision before any replacement, including deletions.
  // If the current object cannot be read, fail rather than overwrite unrecoverable data.
  const nextText=JSON.stringify(data.items);
  if(account.workspace_key){
   const previous=await bucket.get(account.workspace_key);
   // A concurrent save may have replaced (and removed) the object we were about to read: that is a conflict to merge, not a storage fault.
   if(!previous)return await revisionMoved(db,account)?json({error:'CONFLICT'},409):json({error:'STORAGE_UNAVAILABLE'},503);
   const oldItems=await previous.json();if(!validItems(oldItems))return json({error:'STORAGE_UNAVAILABLE'},503);
   const oldText=JSON.stringify(oldItems);
   // Identical content: keep the revision and history unchanged so a no-op save never pushes a real version out of the three kept.
   if(oldText===nextText)return json({revision:account.revision,unchanged:true});
   await bucket.put(historyKey(account.id,account.revision),oldText,{httpMetadata:{contentType:'application/json'}});
  }else if(!data.items.length)return json({revision:account.revision,unchanged:true});
  const key='users/'+account.id+'/'+crypto.randomUUID()+'.json';await bucket.put(key,nextText,{httpMetadata:{contentType:'application/json'}});
  let changed:{revision:number}|null;
  try{changed=await db.prepare('UPDATE accounts SET workspace_key=?,revision=revision+1 WHERE id=? AND revision=? RETURNING revision').bind(key,account.id,account.revision).first<{revision:number}>()}catch(e){await bucket.delete(key).catch(()=>{});throw e}
  if(!changed){await bucket.delete(key).catch(()=>{});return json({error:'CONFLICT'},409)}
  if(account.workspace_key)await bucket.delete(account.workspace_key).catch(()=>{});
  // A slower request may only prune versions older than its own retention window.
  await historyVersions(bucket,account.id).then(versions=>Promise.all(versions.filter(v=>v.revision<changed!.revision-3).map(v=>bucket.delete(v.key)))).catch(()=>{});
  return json({revision:changed.revision});
 }
 return json({error:'NOT_FOUND'},404);
 }catch(e){const code=(e as Error).message;return json({error:code==='SIZE'?'BACKUP_TOO_LARGE':code==='TYPE'||code==='BODY'||e instanceof SyntaxError?'INVALID_REQUEST':'SERVER_ERROR'},code==='SIZE'?413:code==='TYPE'||code==='BODY'||e instanceof SyntaxError?400:500)}
}

function facebookConfig(bindings:Bindings){
 const {FACEBOOK_APP_ID:id,FACEBOOK_APP_SECRET:secret,FACEBOOK_GRAPH_VERSION:version,FACEBOOK_SITE_ORIGIN:origin}=bindings;
 if(bindings.FACEBOOK_LOGIN_ENABLED!=='true'||!id||!/^\d+$/.test(id)||!secret||!version||!/^v\d+\.0$/.test(version)||origin!=='https://makom-lizkor-dima.dimavol11.chatgpt.site')return null;
 return {id,secret,version,origin,callback:origin+'/api/auth/facebook/callback'};
}
const facebookCookie=(value:string,age=600)=>'makom_fb_state='+value+'; Path=/api/auth/facebook; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
function facebookRedirect(location:string,cookies:string[]=[]){const headers=new Headers({'Location':location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});for(const c of cookies)headers.append('Set-Cookie',c);return new Response(null,{status:303,headers})}
async function facebookApi(request:Request,bindings:Bindings):Promise<Response>{
 const config=facebookConfig(bindings),url=new URL(request.url),db=bindings.DB!;
 if(url.pathname.endsWith('/status'))return json({enabled:!!config});
 if(!config)return json({error:'FACEBOOK_NOT_CONFIGURED'},503);
 if(url.origin!==config.origin||request.method!=='GET')return json({error:'FORBIDDEN'},403);
 const finish=(result:string)=>facebookRedirect(config.origin+'/?facebook='+result,[facebookCookie('',0)]);
 if(url.pathname.endsWith('/start')){
  const origin=request.headers.get('Origin'),referer=request.headers.get('Referer'),site=request.headers.get('Sec-Fetch-Site');
  if((origin&&origin!==config.origin)||(referer&&new URL(referer).origin!==config.origin)||site==='cross-site')return json({error:'FORBIDDEN'},403);
  if(!await rate(db,'fb:'+await hash(request.headers.get('CF-Connecting-IP')||'unknown'),20))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const user=await authenticated(request,db),state=random();
  await db.prepare('DELETE FROM facebook_states WHERE expires_at<?').bind(Date.now()).run();
  await db.prepare('INSERT INTO facebook_states(state_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(state),user?.id||null,Date.now()+600000).run();
  const target=new URL('https://www.facebook.com/'+config.version+'/dialog/oauth');
  target.search=new URLSearchParams({client_id:config.id,redirect_uri:config.callback,state,response_type:'code',scope:'public_profile,email'}).toString();
  return facebookRedirect(target.toString(),[facebookCookie(state)]);
 }
 if(!url.pathname.endsWith('/callback'))return json({error:'NOT_FOUND'},404);
 const state=url.searchParams.get('state')||'',cookie=request.headers.get('Cookie')?.match(/(?:^|;\s*)makom_fb_state=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!/^[a-f0-9]{64}$/.test(state)||!cookie||!same(state,cookie))return finish('invalid_state');
 const pending=await db.prepare('DELETE FROM facebook_states WHERE state_hash=? AND expires_at>? RETURNING user_id').bind(await hash(state),Date.now()).first<{user_id:string|null}>();
 if(!pending)return finish('expired');
 const current=await authenticated(request,db);
 if((current?.id||null)!==pending.user_id)return finish('session_changed');
 if(url.searchParams.has('error'))return finish('cancelled');
 const code=url.searchParams.get('code');if(!code||code.length>8192)return finish('failed');
 try{
  const response=await fetch('https://graph.facebook.com/'+config.version+'/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.id,client_secret:config.secret,redirect_uri:config.callback,code}),signal:AbortSignal.timeout(15000)});
  const token=await response.json() as {access_token?:string};if(!response.ok||!token.access_token)return finish('failed');
  const key=await crypto.subtle.importKey('raw',encoder.encode(config.secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const proof=hex(await crypto.subtle.sign('HMAC',key,encoder.encode(token.access_token)));
  const profileUrl=new URL('https://graph.facebook.com/'+config.version+'/me');profileUrl.search=new URLSearchParams({fields:'id,email',appsecret_proof:proof}).toString();
  const profileResponse=await fetch(profileUrl,{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(15000)});
  const profile=await profileResponse.json() as {id?:string;email?:string};
  if(!profileResponse.ok||!profile.id||!/^\d{1,100}$/.test(profile.id))return finish('failed');
  const identity=await db.prepare('SELECT user_id FROM facebook_identities WHERE facebook_id=?').bind(profile.id).first<{user_id:string}>();
  let account:Account|null=null;
  if(current){
   if(identity&&identity.user_id!==current.id)return finish('already_linked');
   const prior=await db.prepare('SELECT facebook_id FROM facebook_identities WHERE user_id=?').bind(current.id).first<{facebook_id:string}>();
   if(prior&&prior.facebook_id!==profile.id)return finish('already_linked');
   if(!identity)await db.prepare('INSERT INTO facebook_identities(facebook_id,user_id) VALUES (?,?)').bind(profile.id,current.id).run();
   account=current;
  }else if(identity){account=await db.prepare('SELECT * FROM accounts WHERE id=?').bind(identity.user_id).first<Account>()}
  else{
   const email=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return finish('email_required');
   if(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first())return finish('sign_in_to_link');
   const id=crypto.randomUUID(),salt=random(),derived=await passwordHash(random(),salt);
   await db.batch([
    db.prepare('INSERT INTO accounts(id,email,salt,password_hash,revision,created_at) VALUES (?,?,?,?,0,?)').bind(id,email,salt,derived,Date.now()),
    db.prepare('INSERT INTO facebook_identities(facebook_id,user_id) VALUES (?,?)').bind(profile.id,id)
   ]);
   account={id,email,salt,password_hash:derived,revision:0,workspace_key:null};
  }
  if(!account)return finish('failed');
  const session=await startSession(account,db,true);
  return facebookRedirect(config.origin+'/?facebook=success',[session.headers.get('Set-Cookie')!,facebookCookie('',0)]);
 }catch{return finish('failed')}
}

function googleConfig(bindings:Bindings){
 const {GOOGLE_CLIENT_ID:id,GOOGLE_CLIENT_SECRET:secret,GOOGLE_SITE_ORIGIN:origin}=bindings;
 if(bindings.GOOGLE_LOGIN_ENABLED!=='true'||!id||!id.endsWith('.apps.googleusercontent.com')||!secret||origin!=='https://makom-lizkor-dima.dimavol11.chatgpt.site')return null;
 return {id,secret,origin,callback:origin+'/api/auth/google/callback'};
}
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function verifyGoogleIdentity(token:string,clientId:string,nonce:string,keys=googleKeys){
 const {payload}=await jwtVerify(token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub','nonce']});
 if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||payload.email_verified!==true||typeof payload.email!=='string')throw Error('INVALID_IDENTITY');
 return {id:payload.sub,email:payload.email};
}
const googleCookie=(value:string,age=600)=>'makom_google_state='+value+'; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
function googleRedirect(location:string,cookies:string[]=[]){const headers=new Headers({'Location':location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});for(const c of cookies)headers.append('Set-Cookie',c);return new Response(null,{status:303,headers})}
async function googleApi(request:Request,bindings:Bindings):Promise<Response>{
 const config=googleConfig(bindings),url=new URL(request.url),db=bindings.DB!;
 if(url.pathname.endsWith('/status'))return json({enabled:!!config});
 if(!config)return json({error:'GOOGLE_NOT_CONFIGURED'},503);
 if(url.origin!==config.origin||request.method!=='GET')return json({error:'FORBIDDEN'},403);
 const finish=(result:string)=>googleRedirect(config.origin+'/?google='+result,[googleCookie('',0)]);
 if(url.pathname.endsWith('/start')){
  const origin=request.headers.get('Origin'),referer=request.headers.get('Referer'),site=request.headers.get('Sec-Fetch-Site');
  if((origin&&origin!==config.origin)||(referer&&new URL(referer).origin!==config.origin)||site==='cross-site')return json({error:'FORBIDDEN'},403);
  if(!await rate(db,'google:'+await hash(request.headers.get('CF-Connecting-IP')||'unknown'),20))return json({error:'TOO_MANY_ATTEMPTS'},429);
  const user=await authenticated(request,db),state=random(),verifier=random(),nonce=random();
  await db.prepare('DELETE FROM google_states WHERE expires_at<?').bind(Date.now()).run();
  await db.prepare('INSERT INTO google_states(state_hash,user_id,expires_at,verifier,nonce) VALUES (?,?,?,?,?)').bind(await hash(state),user?.id||null,Date.now()+600000,verifier,nonce).run();
  const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  target.search=new URLSearchParams({client_id:config.id,redirect_uri:config.callback,state,response_type:'code',scope:'openid email',nonce,code_challenge:btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''),code_challenge_method:'S256',prompt:'select_account'}).toString();
  return googleRedirect(target.toString(),[googleCookie(state)]);
 }
 if(!url.pathname.endsWith('/callback'))return json({error:'NOT_FOUND'},404);
 const state=url.searchParams.get('state')||'',cookie=request.headers.get('Cookie')?.match(/(?:^|;\s*)makom_google_state=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!/^[a-f0-9]{64}$/.test(state)||!cookie||!same(state,cookie))return finish('invalid_state');
 const pending=await db.prepare('DELETE FROM google_states WHERE state_hash=? AND expires_at>? RETURNING user_id,verifier,nonce').bind(await hash(state),Date.now()).first<{user_id:string|null;verifier:string;nonce:string}>();
 if(!pending)return finish('expired');
 const current=await authenticated(request,db);
 if((current?.id||null)!==pending.user_id)return finish('session_changed');
 if(url.searchParams.has('error'))return finish('cancelled');
 const code=url.searchParams.get('code');if(!code||code.length>8192)return finish('failed');
 try{
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.id,client_secret:config.secret,redirect_uri:config.callback,code,code_verifier:pending.verifier,grant_type:'authorization_code'}),signal:AbortSignal.timeout(15000)});
  const token=await response.json() as {id_token?:string};if(!response.ok||!token.id_token)return finish('failed');
  const profile=await verifyGoogleIdentity(token.id_token,config.id,pending.nonce);
  const identity=await db.prepare('SELECT user_id FROM google_identities WHERE google_id=?').bind(profile.id).first<{user_id:string}>();
  let account:Account|null=null;
  if(current){
   if(identity&&identity.user_id!==current.id)return finish('already_linked');
   const prior=await db.prepare('SELECT google_id FROM google_identities WHERE user_id=?').bind(current.id).first<{google_id:string}>();
   if(prior&&prior.google_id!==profile.id)return finish('already_linked');
   if(!identity)await db.prepare('INSERT INTO google_identities(google_id,user_id) VALUES (?,?)').bind(profile.id,current.id).run();
   account=current;
  }else if(identity){account=await db.prepare('SELECT * FROM accounts WHERE id=?').bind(identity.user_id).first<Account>()}
  else{
   const email=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return finish('email_required');
   if(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first())return finish('sign_in_to_link');
   const id=crypto.randomUUID(),salt=random(),derived=await passwordHash(random(),salt);
   await db.batch([
    // Google has already verified this address (verifyGoogleIdentity requires email_verified).
    db.prepare('INSERT INTO accounts(id,email,salt,password_hash,revision,created_at,email_verified_at) VALUES (?,?,?,?,0,?,?)').bind(id,email,salt,derived,Date.now(),Date.now()),
    db.prepare('INSERT INTO google_identities(google_id,user_id) VALUES (?,?)').bind(profile.id,id)
   ]);
   account={id,email,salt,password_hash:derived,revision:0,workspace_key:null};
  }
  if(!account)return finish('failed');
  const session=await startSession(account,db,true);
  return googleRedirect(config.origin+'/?google=success',[session.headers.get('Set-Cookie')!,googleCookie('',0)]);
 }catch{return finish('failed')}
}
