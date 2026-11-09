import {backupText,backupName,BACKUP_LIMIT,parseBackup} from '../backup';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Memory} from '../model';
import {calendarText} from '../calendar';
async function share(text:string,name:string,mimeType:string){if(!await Sharing.isAvailableAsync())throw Error('Sharing unavailable');const file=new File(Paths.cache,name);await file.write(text);await Sharing.shareAsync(file.uri,{mimeType,dialogTitle:'שמירת הקובץ'})}
export async function exportBackup(items:Memory[]){const portable=await Promise.all(items.map(async item=>({...item,notificationScheduled:false,images:await Promise.all(item.images.map(async uri=>{if(uri.startsWith('data:'))return uri;const f=new File(uri);return 'data:'+(f.type||'image/jpeg')+';base64,'+await f.base64()}))})));await share(backupText(portable),backupName(),'application/json')}
export async function exportCalendar(item:Memory){await share(calendarText(item),'reminder.ics','text/calendar')}
export async function saveBackupToCloud(items:Memory[],_provider:'google'|'icloud'):Promise<'shared'|'downloaded'>{await exportBackup(items);return 'shared';}
export async function portableMemories(items:Memory[]):Promise<Memory[]>{return Promise.all(items.map(async item=>({...item,images:await Promise.all(item.images.map(async uri=>{if(uri.startsWith('data:'))return uri;const f=new File(uri);return 'data:'+(f.type||'image/jpeg')+';base64,'+await f.base64()}))})));}

export async function pickBackup():Promise<Memory[]|null>{const picked=await File.pickFileAsync({mimeTypes:['application/json']});if(picked.canceled)return null;const file=picked.result;if(file.size>BACKUP_LIMIT)throw Error('BACKUP_TOO_LARGE');return parseBackup(await file.text())}
