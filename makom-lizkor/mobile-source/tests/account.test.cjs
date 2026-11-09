const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
function load(name,deps={}){const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('exports','require','module',js)(m.exports,k=>deps[k]||require(k),m);return m.exports}
const validation=load('auth-validation');const merge=load('merge');
function service(portableMemories=async x=>x){return load('services/account',{'react-native':{Platform:{OS:'web'}},'./export':{portableMemories},'../merge':merge,'../auth-validation':validation})}
test('credentials distinguish invalid email, short and long passwords, and confirmation',()=>{
 assert.ok(validation.emailError('bad'));assert.ok(validation.emailError('a@ b.com'));assert.equal(validation.emailError(' Person@example.com '),null);
 assert.ok(validation.passwordError('a'.repeat(11)));assert.equal(validation.passwordError('a'.repeat(12)),null);assert.equal(validation.passwordError('a'.repeat(128)),null);assert.ok(validation.passwordError('a'.repeat(129)));
 assert.ok(validation.confirmationError('abc','ABC'));assert.equal(validation.confirmationError(' abc ',' abc '),null);
});
test('bad input sends no requests and password spaces are preserved',async()=>{const original=global.fetch;let calls=0;global.fetch=async(url,init)=>{calls++;assert.equal(url,'/api/auth/register');assert.deepEqual(JSON.parse(init.body),{email:'person@example.com',password:' long password '});return Response.json({user:{id:'one',email:'person@example.com'}})};try{const a=service();await assert.rejects(a.authenticate('register','bad','short'));await assert.rejects(a.requestPasswordReset('bad'));await assert.rejects(a.confirmPasswordReset('a@example.com','abcd1234','long password'));assert.equal(calls,0);await a.authenticate('register',' Person@example.com ',' long password ');assert.equal(calls,1)}finally{global.fetch=original}});
test('failed session lookup is not silently treated as a logged-out account',async()=>{const original=global.fetch;global.fetch=async()=>{throw Error('offline')};try{await assert.rejects(service().session(),e=>e.code==='CONNECTION_ERROR')}finally{global.fetch=original}});
test('workspace requests retain the expected account and never merge session changes',async()=>{const original=global.fetch;let calls=0;global.fetch=async(url,init)=>{calls++;if(url==='/api/auth/session')return Response.json({user:{id:'account-a',email:'a@example.com'}});assert.equal(init.headers['X-Makom-User'],'account-a');if(init.method==='GET')return Response.json({items:[],revision:0});return Response.json({error:'SESSION_CHANGED'},{status:409})};try{const a=service();await a.session();await a.loadCloudMemories();await assert.rejects(a.saveCloudMemories([{id:'n',title:'New',note:'',why:'',intent:'',topic:'אישי',location:'',due:'',birthday:'',images:[],done:false,createdAt:1,notificationScheduled:false}]),e=>e.code==='SESSION_CHANGED');assert.equal(calls,3)}finally{global.fetch=original}});
test('an expired session can still be signed out locally',async()=>{const original=global.fetch;global.fetch=async()=>Response.json({error:'SIGN_IN_REQUIRED'},{status:401});try{await service().logout()}finally{global.fetch=original}});

const model=load('model');const backup=load('backup',{'./model':model});
const memory=(extra={})=>({...model.emptyDraft(),id:'one',title:'Important',done:false,createdAt:1,notificationScheduled:true,...extra});
test('backup round trip keeps image bytes, rejects unsafe files and resets device notifications',()=>{
 const item=memory({images:['data:image/png;base64,AAAA']});const parsed=backup.parseBackup(backup.backupText([item]));assert.equal(parsed[0].images[0],item.images[0]);assert.equal(parsed[0].notificationScheduled,false);
 for(const value of ['broken',JSON.stringify({version:2,items:[]}),JSON.stringify({version:1,items:[item,item]}),backup.backupText([memory({images:['file:///private/image.jpg']})]),backup.backupText([memory({images:['https://evil.test/pixel']})])])assert.throws(()=>backup.parseBackup(value));
});
test('recovery preserves current changes, restores missing items, and is idempotent',()=>{
 const current=[memory({title:'new title'})],old=[memory(),memory({id:'two',title:'Deleted'})];let n=0;const restored=backup.recoverMemories(current,old,()=> 'recovered-'+(++n));assert.equal(restored.length,3);assert.equal(restored[0].title,'new title');assert.equal(restored[1].title,'Important');assert.notEqual(restored[1].id,'one');assert.equal(restored[1].notificationScheduled,false);assert.deepEqual(backup.recoverMemories(restored,old),restored);
});
test('backup names retain distinct timestamps',()=>{assert.notEqual(backup.backupName(new Date('2026-11-04T10:00:00Z')),backup.backupName(new Date('2026-11-04T10:00:01Z')))});
test('a save blocks late background reads and concurrent saves without dropping remote additions',async()=>{
 const original=global.fetch;let resolveRead,readStarted,releaseImages;const started=new Promise(r=>readStarted=r);let reads=0,puts=0;
 const old=memory(),remote=memory({id:'remote',title:'Other device'});let server=[old],revision=1;
 global.fetch=async(url,init)=>{if(url.endsWith('auth/session'))return Response.json({user:{id:'one',email:'one@example.test'}});if(init.method==='GET'){reads++;if(reads===2){readStarted();return new Promise(r=>resolveRead=r)}return Response.json({items:server,revision})}puts++;const body=JSON.parse(init.body);if(body.revision!==revision)return Response.json({error:'CONFLICT'},{status:409});server=body.items;return Response.json({revision:++revision})};
 try{const a=service(()=>new Promise(r=>releaseImages=r));await a.session();await a.loadCloudMemories();const late=a.loadCloudMemories();await started;const lateCheck=assert.rejects(late);const mine=[{...old,title:'My edit'}];const saving=a.saveCloudMemories(mine);await assert.rejects(a.saveCloudMemories(mine),e=>e.code==='SAVE_IN_PROGRESS');server=[old,remote];revision=2;resolveRead(Response.json({items:[old],revision:1}));await lateCheck;releaseImages(mine);const saved=await saving;assert.equal(puts,2);assert.equal(saved.length,2);assert.equal(saved.find(i=>i.id==='one').title,'My edit');assert.ok(saved.some(i=>i.id==='remote'))}finally{global.fetch=original}
});
test('cannot save before loading the account workspace',async()=>{const original=global.fetch;global.fetch=async()=>Response.json({user:{id:'a',email:'a@example.test'}});try{const a=service();await a.session();await assert.rejects(a.saveCloudMemories([]),e=>e.code==='WORKSPACE_NOT_LOADED')}finally{global.fetch=original}});
test('account changes while converting images cannot write into the next account',async()=>{const original=global.fetch;let release,user='a',puts=0;global.fetch=async(url,init)=>{if(url.endsWith('auth/session'))return Response.json({user:{id:user,email:user+'@example.test'}});if(init.method==='PUT')puts++;return Response.json({items:[],revision:0})};try{const a=service(()=>new Promise(r=>release=r));await a.session();await a.loadCloudMemories();const pending=a.saveCloudMemories([]);user='b';await a.session();release([]);await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');assert.equal(puts,0)}finally{global.fetch=original}});
test('a save that changes nothing for the account sends no request and keeps the revision',async()=>{const original=global.fetch;const puts=[];const item={id:'x',title:'T',note:'',why:'',intent:'',topic:'אישי',location:'',due:'',birthday:'',images:[],done:false,createdAt:1,notificationScheduled:false};let revision=4;
 global.fetch=async(url,init)=>{if(url.endsWith('auth/session'))return Response.json({user:{id:'a',email:'a@example.test'}});if(init.method==='PUT'){puts.push(JSON.parse(init.body));return Response.json({revision:++revision})}return Response.json({items:[item],revision})};
 try{const a=service();await a.session();await a.loadCloudMemories();
  // only the device-local notification flag differs, with keys in another order
  const reordered=Object.fromEntries(Object.entries({...item,notificationScheduled:true}).reverse());const same=await a.saveCloudMemories([reordered]);assert.equal(puts.length,0);assert.equal(same[0].notificationScheduled,true);assert.equal(a.isSaving(),false);
  await a.saveCloudMemories([{...item,title:'changed'}]);assert.equal(puts.length,1);assert.equal(puts[0].revision,4);
  await a.saveCloudMemories([{...item,title:'changed'}]);assert.equal(puts.length,1,'the saved state is the new baseline');
  await a.saveCloudMemories([{...item,title:'again'}]);assert.equal(puts[1].revision,5);
 }finally{global.fetch=original}});
test('photos are scaled down to fit the account limit, never up, and GIFs or small files are kept',()=>{const size=load('image-size');
 assert.deepEqual(size.fitSize(4032,3024),{width:1600,height:1200});assert.deepEqual(size.fitSize(3024,4032),{width:1200,height:1600});assert.deepEqual(size.fitSize(800,600),{width:800,height:600});assert.deepEqual(size.fitSize(0,10),{width:0,height:0});assert.deepEqual(size.fitSize(20000,10),{width:1600,height:1});
 const big='A'.repeat(800*1024);assert.equal(size.shouldShrink('data:image/jpeg;base64,'+big),true);assert.equal(size.shouldShrink('data:image/png;base64,'+big),true);assert.equal(size.shouldShrink('data:image/gif;base64,'+big),false);assert.equal(size.shouldShrink('data:image/jpeg;base64,AAAA'),false);assert.equal(size.shouldShrink('file:///x.jpg'),false)});
test('new passwords use the same guessability rule as the server; sign-in does not',async()=>{
 const bad=['aaaaaaaaaaaa','abababababab','123456789012','098765432109','qwertyuiopas','abcdefghijklmnop','            ','   short    ','me@example.com'];
 const good=['Long safe test passphrase!','סיסמה ארוכה וטובה 2026','correct horse battery','Пароль надёжный 42'];
 for(const p of bad)assert.ok(validation.strongPasswordError(p,'Me@Example.com '),p);for(const p of good)assert.equal(validation.strongPasswordError(p,'me@example.com'),null,p);
 // the server runs the same rule (kept in lib/account-api.ts): compare on the same inputs
 const ts=require('typescript');const src=fs.readFileSync(path.join(__dirname,'../../lib/account-api.ts'),'utf8');const fn=src.slice(src.indexOf('export function weakPassword'),src.indexOf('async function loginFailures'));
 const m={exports:{}};new Function('exports','module',ts.transpileModule(fn,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);
 for(const p of [...bad,...good,'a'.repeat(30),'Zz9!Zz9!Zz9!'])assert.equal(m.exports.weakPassword(p,'me@example.com'),validation.strongPasswordError(p,'me@example.com')!==null,p);
 const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return Response.json({user:{id:'u',email:'me@example.com'}})};
 try{const a=service();await assert.rejects(a.authenticate('register','me@example.com','123456789012'),e=>e.code===validation.WEAK_PASSWORD_MESSAGE);assert.equal(calls,0);
  await a.authenticate('login','me@example.com','aaaaaaaaaaaa');assert.equal(calls,1,'sign-in with an old weak password is still sent');
  assert.equal(a.accountErrorMessage(new a.AccountError('WEAK_PASSWORD')),validation.WEAK_PASSWORD_MESSAGE);assert.equal(a.accountErrorMessage(new a.AccountError(validation.WEAK_PASSWORD_MESSAGE)),validation.WEAK_PASSWORD_MESSAGE)}finally{global.fetch=original}});
test('device reminder flags come from the device, and only unhandled device items are offered to the account',()=>{
 const model=load('model');const item=(id,extra={})=>({id,title:id,note:'',why:'',intent:'',topic:'אישי',location:'',due:'',birthday:'',images:[],done:false,createdAt:1,notificationScheduled:false,...extra});
 const marked=model.withDeviceReminders([item('a'),item('b'),item('c',{done:true})],new Set(['a','c']));assert.deepEqual(marked.map(i=>i.notificationScheduled),[true,false,false]);
 const pending=model.pendingDeviceItems([item('a'),item('local-1'),item('local-2'),item('old')],[item('a')],['old']);assert.deepEqual(pending.map(i=>i.id),['local-1','local-2']);
 assert.deepEqual(model.pendingDeviceItems([],[item('a')],[]),[]);});
test('common email domain typos get a suggestion, real domains do not',()=>{
 const s=validation.emailSuggestion;
 for(const [typo,fixed] of [['dima@gmial.com','dima@gmail.com'],['Dima@GMAIL.CON','dima@gmail.com'],['a@gmail.co','a@gmail.com'],['a@hotmial.com','a@hotmail.com'],['a@outlok.com','a@outlook.com'],['a@icloud.co','a@icloud.com'],['a@wala.co.il','a@walla.co.il'],['a@yaho.com','a@yahoo.com']])assert.equal(s(typo),fixed,typo);
 for(const ok of ['a@gmail.com','a@mail.com','a@me.com','a@ymail.com','a@company.co.il','a@example.test','a@university.ac.il','bad-address','a@gmx.net'])assert.equal(s(ok),null,ok);
});
test('the installable-app service worker never handles account requests',()=>{
 const listeners={};const self={location:{origin:'https://app.test'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting(){},clients:{claim(){}}};
 new Function('self','caches','fetch',fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8'))(self,{open:async()=>({put(){},addAll:async()=>{}}),match:async()=>undefined,keys:async()=>[]},async()=>new Response('x'));
 const handled=(url,method='GET',mode='cors')=>{let used=false;listeners.fetch({request:{url,method,mode},respondWith(p){used=true;Promise.resolve(p).catch(()=>{})},waitUntil(p){Promise.resolve(p).catch(()=>{})}});return used};
 for(const u of ['https://app.test/api/memories','https://app.test/api/backups/3','https://app.test/api/auth/session'])assert.equal(handled(u),false,u);
 assert.equal(handled('https://app.test/api/memories','PUT'),false);assert.equal(handled('https://app.test/','POST','navigate'),false);assert.equal(handled('https://other.test/x.js'),false);
 assert.equal(handled('https://app.test/','GET','navigate'),true);assert.equal(handled('https://app.test/_expo/static/js/web/index-1.js'),true);assert.equal(handled('https://app.test/icon-192.png'),true);
});
test('email verification requests carry the account, validate input first and map errors to Hebrew',async()=>{const original=global.fetch;const calls=[];
 global.fetch=async(url,init)=>{calls.push({url,method:init.method,body:init.body&&JSON.parse(init.body),user:init.headers['X-Makom-User']});if(url.endsWith('auth/session'))return Response.json({user:{id:'u1',email:'a@example.com',verificationRequired:true}});if(url.endsWith('account/verify'))return Response.json({ok:true,user:{id:'u1',email:'a@example.com',emailVerified:true,verificationRequired:false}});if(url.endsWith('account/email'))return Response.json({ok:true,user:{id:'u1',email:'fixed@gmail.com',verificationRequired:true,verificationSent:true}});return Response.json({error:'EMAIL_SEND_FAILED'},{status:502})};
 try{const a=service();const s=await a.session();assert.equal(s.user.verificationRequired,true);
  await assert.rejects(a.verifyEmail('12ab'),e=>e.code==='INVALID_CODE');assert.equal(calls.length,1,'a malformed code sends nothing');
  const v=await a.verifyEmail(' 12345678 ');assert.equal(v.emailVerified,true);assert.deepEqual(calls.at(-1).body,{code:'12345678'});assert.equal(calls.at(-1).user,'u1');
  await assert.rejects(a.changeUnverifiedEmail('not-an-email','Long safe test passphrase!'),e=>/אימייל/.test(e.code));
  const u=await a.changeUnverifiedEmail(' Fixed@Gmail.com ','Long safe test passphrase!');assert.equal(u.email,'fixed@gmail.com');assert.deepEqual(calls.at(-1).body,{email:'fixed@gmail.com',password:'Long safe test passphrase!'});
  await assert.rejects(a.sendVerificationCode(),e=>e.code==='EMAIL_SEND_FAILED');
  for(const code of ['EMAIL_NOT_VERIFIED','VERIFY_UNAVAILABLE','EMAIL_SEND_FAILED','EMAIL_ALREADY_VERIFIED'])assert.match(a.accountErrorMessage(new a.AccountError(code)),/[֐-׿]/,code);
 }finally{global.fetch=original}});
