import {Platform} from 'react-native';
import {Memory} from '../model';
import {portableMemories} from './export';
import {saveWithMerge,sameList} from '../merge';
import {credentialsError,emailError,strongPasswordError,WEAK_PASSWORD_MESSAGE} from '../auth-validation';
export type User={id:string;email:string;emailVerified?:boolean;verificationRequired?:boolean;verificationSent?:boolean};
let revision=0;let synced:Memory[]=[];let loaded=false;let epoch=0;let saving=false;
/** True while a save to the account is in flight (used to warn before closing the page). */
export const isSaving=()=>saving;let activeUserId:string|null=null;const norm=(i:Memory):Memory=>({...i,notificationScheduled:false});
const base=Platform.OS==='web'?'':(process.env.EXPO_PUBLIC_API_URL||'https://makom-lizkor-dima.dimavol11.chatgpt.site');export const privacyUrl=process.env.EXPO_PUBLIC_PREVIEW==='1'?'privacy.html':base+'/privacy.html';
export class AccountError extends Error{constructor(public code:string){super(code)}}
/** Time allowed for a request: 20 s plus time to upload the body at a slow mobile speed (~40 KB/s), at most 4 minutes. */
export const requestTimeout=(bodyLength:number)=>Math.min(240000,20000+Math.ceil(bodyLength/40));
async function api(path:string,method='GET',data?:unknown){const body=data?JSON.stringify(data):undefined;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),requestTimeout(body?.length||0));try{const r=await fetch(base+'/api/'+path,{method,credentials:'include',headers:{...(data?{'Content-Type':'application/json'}:{}),...(activeUserId?{'X-Makom-User':activeUserId}:{})},body,signal:controller.signal});const result=await r.json();if(!r.ok)throw new AccountError(result.error||'SERVER_ERROR');return result;}catch(e){if(e instanceof AccountError)throw e;throw new AccountError('CONNECTION_ERROR')}finally{clearTimeout(timer)}}
/** Preview build (EXPO_PUBLIC_PREVIEW=1): no server, no accounts; items stay in this browser only. */
export const PREVIEW=process.env.EXPO_PUBLIC_PREVIEW==='1';
export async function session():Promise<{available:boolean;user:User|null}>{if(PREVIEW){activeUserId=null;revision=0;synced=[];loaded=false;epoch++;return {available:false,user:null}}const result=await api('auth/session');activeUserId=result.user?.id||null;revision=0;synced=[];loaded=false;epoch++;return {available:true,user:result.user}}
export async function authenticate(mode:'register'|'login',email:string,password:string):Promise<User>{const invalid=credentialsError(email,password)||(mode==='register'?strongPasswordError(password,email):null);if(invalid)throw new AccountError(invalid);const result=await api('auth/'+mode,'POST',{email:email.trim().toLowerCase(),password});activeUserId=result.user.id;revision=0;synced=[];loaded=false;epoch++;return result.user}
export async function logout():Promise<void>{try{await api('auth/logout','POST',{})}catch(e){if(!(e instanceof AccountError)||e.code!=='SIGN_IN_REQUIRED')throw e}activeUserId=null;revision=0;synced=[]}
export async function requestPasswordReset(email:string):Promise<void>{const invalid=emailError(email);if(invalid)throw new AccountError(invalid);await api('auth/forgot','POST',{email:email.trim().toLowerCase()})}
export async function confirmPasswordReset(email:string,code:string,password:string):Promise<void>{const invalid=emailError(email)||strongPasswordError(password,email);if(invalid)throw new AccountError(invalid);if(!/^\d{8}$/.test(code.trim()))throw new AccountError('INVALID_CODE');await api('auth/reset','POST',{email:email.trim().toLowerCase(),code:code.trim(),password})}
export async function deleteAccount(confirmEmail:string):Promise<void>{await api('account/delete','POST',{confirmEmail});activeUserId=null;revision=0;synced=[]}
export async function loadCloudMemories():Promise<Memory[]>{
 const expected=activeUserId,stamp=epoch;if(!expected)throw new AccountError('SIGN_IN_REQUIRED');
 if(saving)throw new AccountError('SAVE_IN_PROGRESS');
 const data=await api('memories');if(expected!==activeUserId||stamp!==epoch)throw new AccountError('SESSION_CHANGED');
 revision=data.revision;synced=data.items.map(norm);loaded=true;return synced;
}
export async function saveCloudMemories(items:Memory[]):Promise<Memory[]>{
 if(!activeUserId)throw new AccountError('SIGN_IN_REQUIRED');if(!loaded)throw new AccountError('WORKSPACE_NOT_LOADED');if(saving)throw new AccountError('SAVE_IN_PROGRESS');
 const expected=activeUserId,baseItems=synced;let expectedRevision=revision;const stamp=++epoch;saving=true;
 const check=()=>{if(expected!==activeUserId||stamp!==epoch)throw new AccountError('SESSION_CHANGED')};
 try{
  const mine=(await portableMemories(items)).map(norm);check();
  // Nothing changed for the account (e.g. only this device's notification flag): no request, no new revision.
  if(sameList(mine,baseItems))return items;
  const result=await saveWithMerge({mine,base:baseItems,put:async list=>{check();const data=await api('memories','PUT',{items:list,revision:expectedRevision});check();expectedRevision=data.revision},latest:async()=>{check();const data=await api('memories');check();expectedRevision=data.revision;return data.items.map(norm)},isConflict:e=>e instanceof AccountError&&e.code==='CONFLICT'});
  check();revision=expectedRevision;synced=result.items;return result.merged?result.items:items;
 }finally{saving=false}
}
export async function sendVerificationCode():Promise<void>{await api('account/verify/send','POST',{})}
export async function verifyEmail(code:string):Promise<User>{if(!/^\d{8}$/.test(code.trim()))throw new AccountError('INVALID_CODE');const result=await api('account/verify','POST',{code:code.trim()});return result.user}
/** Only before verification: fixes a mistyped address (the password is required) and sends a new code. */
export async function changeUnverifiedEmail(email:string,password:string):Promise<User>{const invalid=emailError(email);if(invalid)throw new AccountError(invalid);const result=await api('account/email','POST',{email:email.trim().toLowerCase(),password});return result.user}
export async function listCloudBackups():Promise<number[]>{const result=await api('backups');return result.versions}
export async function readCloudBackup(version:number):Promise<Memory[]>{const result=await api('backups/'+version);return result.items.map(norm)}
export function accountErrorMessage(error:unknown):string{const code=error instanceof AccountError?error.code:'SERVER_ERROR';if(/[\u0590-\u05ff]/.test(code))return code;return ({WORKSPACE_NOT_LOADED:'יש לטעון את החשבון לפני שמירה. נסה שוב.',SAVE_IN_PROGRESS:'השמירה הקודמת עדיין מתבצעת. המתן רגע.',STORAGE_UNAVAILABLE:'לא ניתן לקרוא את השמירה הקודמת. הנתונים לא הוחלפו. נסה שוב.',SESSION_CHANGED:'החשבון השתנה בלשונית אחרת. רענן את הדף לפני המשך העבודה.',CONFLICT:'הנתונים השתנו במכשיר אחר ולא הצלחנו לאחד אותם. נסה שוב בעוד רגע.',INVALID_LOGIN:'האימייל או הסיסמה אינם נכונים.',INVALID_CREDENTIAL_FORMAT:'יש להזין אימייל תקין וסיסמה באורך 12 תווים לפחות.',EMAIL_IN_USE:'האימייל כבר רשום. נסה להתחבר.',TOO_MANY_ATTEMPTS:'בוצעו ניסיונות רבים. נסה שוב מאוחר יותר.',BACKUP_TOO_LARGE:'הפריטים גדולים מדי לשמירה אחת. הגודל המרבי כרגע הוא 20 MB.',SIGN_IN_REQUIRED:'יש להתחבר שוב לחשבון.',CONNECTION_ERROR:'לא הצלחנו להתחבר לשרת. הפריטים הקיימים לא נמחקו.',CONFIRMATION_MISMATCH:'האימייל שהוקלד אינו תואם לחשבון.',RESET_UNAVAILABLE:'שחזור סיסמה במייל עדיין לא הופעל באתר.',INVALID_CODE:'הקוד שגוי או שפג תוקפו. בקש קוד חדש.',EMAIL_NOT_VERIFIED:'יש לאמת את האימייל לפני שמירת פריטים.',SERVICE_UNAVAILABLE:'שירות החשבונות אינו זמין כרגע. הפריטים שלך לא נמחקו. נסה שוב בעוד כמה דקות.',SERVER_ERROR:'אירעה תקלה בשרת. הפריטים שלך לא נמחקו. נסה שוב בעוד רגע.',INVALID_REQUEST:'הבקשה לא נשלחה כראוי. רענן את הדף ונסה שוב.',INVALID_ITEMS:'חלק מהפריטים אינם תקינים ולכן לא נשמרו. רענן את הדף ונסה שוב.',NOT_FOUND:'הפריט או הגרסה המבוקשים לא נמצאו.',FORBIDDEN:'הפעולה נחסמה מטעמי אבטחה. פתח את האתר מהכתובת הרגילה ונסה שוב.',METHOD:'הבקשה לא נשלחה כראוי. רענן את הדף ונסה שוב.',GOOGLE_NOT_CONFIGURED:'הכניסה עם Google עדיין לא פעילה.',FACEBOOK_NOT_CONFIGURED:'הכניסה עם פייסבוק אינה פעילה.',AI_DISABLED:'האתר אינו משתמש בבינה מלאכותית.',VERIFY_UNAVAILABLE:'אימות אימייל עדיין לא הופעל באתר.',EMAIL_SEND_FAILED:'לא הצלחנו לשלוח מייל כרגע. נסה שוב בעוד כמה דקות.',EMAIL_ALREADY_VERIFIED:'האימייל כבר אומת, ולא ניתן לשנות אותו כאן.',WEAK_PASSWORD:WEAK_PASSWORD_MESSAGE} as Record<string,string>)[code]||'הפעולה נכשלה. נסה שוב.'}
