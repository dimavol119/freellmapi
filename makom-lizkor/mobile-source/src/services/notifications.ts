import {Memory} from '../model';
export async function scheduleReminder(_memory:Memory):Promise<boolean>{return false;}
export async function cancelReminder(_id:string):Promise<void>{}
/** Ids of memories with a reminder scheduled on this device (none in the browser). */
export async function scheduledReminderIds():Promise<Set<string>>{return new Set();}
