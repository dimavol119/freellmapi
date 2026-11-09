export function emailError(email:string):string|null {
 const value=email.trim();
 return value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?null:'יש להזין כתובת אימייל תקינה.';
}
export function passwordError(password:string):string|null {
 return password.length>=12&&password.length<=128?null:'הסיסמה צריכה להכיל בין 12 ל־128 תווים.';
}
export function credentialsError(email:string,password:string):string|null {
 return emailError(email)||passwordError(password);
}
export function confirmationError(password:string,confirmation:string):string|null {
 return password===confirmation?null:'הסיסמאות אינן תואמות. הקלד אותן שוב.';
}
/** Same rule as the server: new passwords that are long enough but trivially guessable are refused. Not used for sign-in. */
export const WEAK_PASSWORD_MESSAGE='הסיסמה קלה מדי לניחוש. אפשר להשתמש במשפט קצר שקל לך לזכור.';
export function strongPasswordError(password:string,email:string):string|null {
 const basic=passwordError(password);if(basic)return basic;
 const lower=password.toLowerCase(),rows=['0123456789'.repeat(4),'9876543210'.repeat(4),'qwertyuiopasdfghjklzxcvbnm','abcdefghijklmnopqrstuvwxyz'];
 return password.trim().length<12||new Set(lower).size<5||lower.trim()===email.trim().toLowerCase()||rows.some(r=>r.includes(lower))?WEAK_PASSWORD_MESSAGE:null;
}
const COMMON_DOMAINS=['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','live.com','walla.co.il','walla.com','mail.ru','yandex.ru','protonmail.com','proton.me','hotmail.co.il','bezeqint.net','netvision.net.il'];
const OTHER_REAL_DOMAINS=['mail.com','email.com','ymail.com','me.com','mac.com','msn.com','aol.com','gmx.com','gmx.net','web.de','yandex.com','inbox.ru','list.ru','bk.ru','012.net.il','zahav.net.il','googlemail.com','outlook.co.il','yahoo.co.il','live.co.il'];
function distance(a:string,b:string){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp}}return row[b.length]}
/** Without email verification a mistyped address can never receive a reset code, so suggest the likely common domain. */
export function emailSuggestion(email:string):string|null {
 const value=email.trim().toLowerCase(),at=value.lastIndexOf('@');if(at<1||emailError(value))return null;
 const local=value.slice(0,at),domain=value.slice(at+1);if(COMMON_DOMAINS.includes(domain)||OTHER_REAL_DOMAINS.includes(domain))return null;
 let best:string|null=null,score=Infinity;for(const d of COMMON_DOMAINS){const n=distance(domain,d);if(n<score){score=n;best=d}}
 return best&&score<=(best.length>=9?2:1)?local+'@'+best:null;
}
