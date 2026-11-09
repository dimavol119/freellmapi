import {Memory,parseDay,emptyDraft} from './model';
export type BirthdayRow={key:string;name:string;date:string;error:'format'|'duplicate'|null};
export function parseBirthdayList(text:string,existing:Memory[],now=new Date()):BirthdayRow[]{
 const seen=new Set(existing.filter(i=>i.birthday).map(i=>i.title.trim().toLocaleLowerCase()+';'+i.birthday.slice(5)));
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);
 return text.split(/\r?\n/).filter(x=>x.trim()).slice(0,100).map((line,index)=>{
  const parts=line.split(';'),name=(parts[0]||'').trim(),date=(parts[1]||'').trim(),day=parseDay(date);
  const identity=name.toLocaleLowerCase()+';'+date.slice(5);
  const error=parts.length!==2||!name||name.length>200||!day||day>today?'format':seen.has(identity)?'duplicate':null;
  if(!error)seen.add(identity);
  return {key:String(index),name,date,error};
 });
}
export function selectedBirthdays(rows:BirthdayRow[],selected:string[],now=Date.now()):Memory[]{
 return rows.filter(row=>!row.error&&selected.includes(row.key)).map((row,index)=>({...emptyDraft('ימי הולדת'),id:'birthday-'+now.toString(36)+'-'+index+'-'+Math.random().toString(36).slice(2),title:row.name,birthday:row.date,createdAt:now+index,done:false,notificationScheduled:false}));
}
