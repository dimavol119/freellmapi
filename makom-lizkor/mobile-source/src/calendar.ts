import {Memory,parseDay,parseDue} from './model';
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const timestamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function calendarText(item:Memory):string{
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Makom Lizkor//HE','BEGIN:VEVENT','UID:'+item.id+'@makom-lizkor','DTSTAMP:'+timestamp(new Date())];
 if(item.birthday){const date=parseDay(item.birthday);if(!date)throw Error('Invalid birthday');const original=date;const today=new Date();let year=today.getFullYear();let event=new Date(year,original.getMonth(),original.getDate(),9);while(event<today||event.getMonth()!==original.getMonth()){year++;event=new Date(year,original.getMonth(),original.getDate(),9)}lines.push('DTSTART:'+timestamp(event),'RRULE:FREQ=YEARLY');}
 else{const date=parseDue(item.due);if(!date)throw Error('Invalid date');lines.push('DTSTART:'+timestamp(date),'DTEND:'+timestamp(new Date(+date+1800000)));}
 lines.push('SUMMARY:'+escape((item.birthday?'יום הולדת · ':'')+item.title),'DESCRIPTION:'+escape([item.note,item.why&&'למה שמרתי: '+item.why,item.intent&&'הכוונה שלי: '+item.intent].filter(Boolean).join('\n')),'LOCATION:'+escape(item.location),'BEGIN:VALARM',item.remindBeforeDays===1?'TRIGGER:-P1D':'TRIGGER:PT0S','ACTION:DISPLAY','DESCRIPTION:Reminder','END:VALARM','END:VEVENT','END:VCALENDAR');
 return lines.map(line=>{let result='',length=0;for(const char of line){const size=encodeURIComponent(char).replace(/%[A-F\d]{2}/gi,'x').length;if(length+size>72){result+='\r\n ';length=1}result+=char;length+=size}return result}).join('\r\n')+'\r\n';
}
