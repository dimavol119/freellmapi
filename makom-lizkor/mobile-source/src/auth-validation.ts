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
