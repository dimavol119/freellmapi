import {Memory,isMemory} from './model';
export const BACKUP_LIMIT=32*1024*1024;
const imageData=/^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,[a-zA-Z0-9+/=\r\n]+$/;
export function parseBackup(text:string):Memory[]{
 if(new TextEncoder().encode(text).length>BACKUP_LIMIT)throw Error('BACKUP_TOO_LARGE');
 let data:unknown;try{data=JSON.parse(text)}catch{throw Error('INVALID_BACKUP')}
 const value=data as {version?:number;items?:unknown};
 if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>2000)throw Error('INVALID_BACKUP');
 const ids=new Set<string>();
 return value.items.map(item=>{
  if(!isMemory(item)||!item.id||item.id.length>160||ids.has(item.id)||item.images.length>30||!item.images.every(uri=>imageData.test(uri))||['title','note','why','intent','topic','location','due','birthday'].some(k=>(item[k as keyof Memory] as string).length>=30000)||(item.reminderSound!==undefined&&typeof item.reminderSound!=='boolean')||(item.remindBeforeDays!==undefined&&![0,1].includes(item.remindBeforeDays)))throw Error('INVALID_BACKUP');
  ids.add(item.id);return {...item,notificationScheduled:false};
 });
}
const canonical=(item:Memory)=>JSON.stringify(item,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).filter(([k])=>!['id','notificationScheduled'].includes(k)).sort(([a],[b])=>a.localeCompare(b))):v);
/** Recovery only adds items. Differing copies get new IDs; existing text is never overwritten. */
export function recoverMemories(current:Memory[],backup:Memory[],makeId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)):Memory[]{
 const result=[...current],ids=new Set(current.map(i=>i.id)),contents=new Set(current.map(canonical));
 for(const item of backup){const signature=canonical(item);if(contents.has(signature))continue;let id=item.id;while(ids.has(id))id=makeId();result.push({...item,id,notificationScheduled:false});ids.add(id);contents.add(signature)}
 if(result.length>2000)throw Error('BACKUP_TOO_LARGE');return result;
}
export const backupName=(at=new Date())=>'makom-lizkor-backup-'+at.toISOString().replace(/[:.]/g,'-')+'.json';
export const backupText=(items:Memory[])=>JSON.stringify({version:1,createdAt:new Date().toISOString(),items:items.map(i=>({...i,notificationScheduled:false}))},null,2);
