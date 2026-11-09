import {backupText,backupName,BACKUP_LIMIT,parseBackup} from '../backup';
import {Memory} from '../model';
import {calendarText} from '../calendar';
function download(content:string,type:string,name:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
export async function exportBackup(items:Memory[]){download(backupText(items),'application/json',backupName())}
export async function exportCalendar(item:Memory){download(calendarText(item),'text/calendar;charset=utf-8','reminder.ics')}
export async function saveBackupToCloud(items:Memory[],_provider:'google'|'icloud'):Promise<'shared'|'downloaded'>{
 const file=new File([backupText(items)],backupName(),{type:'application/json'});
 if(typeof navigator.share==='function' && typeof navigator.canShare==='function' && navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'Makom Lizkor backup'});return 'shared';
 }
 await exportBackup(items);return 'downloaded';
}
export async function portableMemories(items:Memory[]):Promise<Memory[]>{return items;}

export function pickBackup():Promise<Memory[]|null>{return new Promise((resolve,reject)=>{
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.style.display='none';document.body.appendChild(input);
 const cleanup=()=>input.remove();input.oncancel=()=>{cleanup();resolve(null)};
 input.onchange=async()=>{try{const file=input.files?.[0];if(!file){resolve(null);return}if(file.size>BACKUP_LIMIT)throw Error('BACKUP_TOO_LARGE');resolve(parseBackup(await file.text()))}catch(e){reject(e)}finally{cleanup()}};input.click();
})}
