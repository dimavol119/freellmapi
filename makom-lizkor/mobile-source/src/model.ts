export const TOPICS = ['אישי', 'משפחה', 'עבודה', 'רעיונות', 'טיולים', 'ימי הולדת', 'לימודים'];
export type Memory = {
  id: string; title: string; note: string; why: string; intent: string;
  topic: string; location: string; images: string[]; due: string;
  birthday: string; reminderSound?:boolean; remindBeforeDays?:0|1; done: boolean; createdAt: number; notificationScheduled: boolean;
};
export type Draft = Pick<Memory, 'title'|'note'|'why'|'intent'|'topic'|'location'|'images'|'due'|'birthday'|'reminderSound'|'remindBeforeDays'>;
export type Filter = 'all'|'pending'|'reminders'|'images'|'done';
export const emptyDraft = (topic='אישי'): Draft => ({title:'',note:'',why:'',intent:'',topic,location:'',images:[],due:'',birthday:'',reminderSound:true,remindBeforeDays:0});
export function parseDay(input:string): Date|null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [y,m,d] = input.split('-').map(Number);
  if(y<1900 || y>2200) return null;
  const date = new Date(y,m-1,d,12);
  return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? date : null;
}
export function parseDue(input:string): Date|null {
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input)) return null;
  const [day,time]=input.split(' '); const date=parseDay(day); if(!date)return null;
  const [h,m]=time.split(':').map(Number);if(h>23||m>59)return null;
  date.setHours(h,m,0,0);return date.getHours()===h&&date.getMinutes()===m?date:null;
}
export function nextBirthday(day:string, now=new Date()):Date|null {
  const original=parseDay(day); if(!original)return null;
  const year=now.getFullYear();
  for(let y=year;y<=year+8;y++){const candidate=new Date(y,original.getMonth(),original.getDate(),9,0,0);if(candidate.getMonth()===original.getMonth()&&candidate>now)return candidate;}
  return null;
}
export function validateDraft(d:Draft, original?:{due:string}|null):string|null {
  if(!d.title.trim())return 'צריך לתת לזיכרון כותרת.';
  if(d.topic==='ימי הולדת') {
    const date=parseDay(d.birthday);if(!date || date>new Date())return 'יש להזין תאריך לידה תקין, למשל 1995-03-21.';
  } else if(d.due && d.due!==original?.due && (!parseDue(d.due) || parseDue(d.due)!<=new Date())) return 'מועד התזכורת צריך להיות בעתיד, בפורמט 2026-12-31 09:00.';
  return null;
}
export function selectMemories(items:Memory[],query:string,topic:string,filter:Filter,sort:'new'|'date',now=new Date()):Memory[]{
  const q=query.toLocaleLowerCase().trim();
  const time=(i:Memory)=>i.topic==='ימי הולדת'?nextBirthday(i.birthday,now)?.getTime()??Infinity:parseDue(i.due)?.getTime()??Infinity;
  return items.filter(i=>(!topic||i.topic===topic)&&(!q||[i.title,i.note,i.why,i.intent,i.topic,i.location].join(' ').toLocaleLowerCase().includes(q))&&(filter==='all'||filter==='pending'&&!i.done||filter==='done'&&i.done||filter==='images'&&i.images.length>0||filter==='reminders'&&!i.done&&!!(i.due||i.birthday))).sort((a,b)=>sort==='new'?b.createdAt-a.createdAt:time(a)-time(b));
}
export function isMemory(value:unknown):value is Memory{
  if(!value||typeof value!=='object')return false;const i=value as Record<string,unknown>;
  return ['id','title','note','why','intent','topic','location','due','birthday'].every(k=>typeof i[k]==='string') && Array.isArray(i.images)&&i.images.every(x=>typeof x==='string')&&typeof i.done==='boolean'&&typeof i.createdAt==='number'&&Number.isFinite(i.createdAt)&&typeof i.notificationScheduled==='boolean';
}


