import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {Memory,parseDay,parseDue} from '../model';
Notifications.setNotificationHandler({handleNotification:async n=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:!!n.request.content.sound,shouldSetBadge:false})});
export async function cancelReminder(id:string){await Notifications.cancelScheduledNotificationAsync('memory-'+id)}
export async function scheduleReminder(memory:Memory):Promise<boolean>{
  if(memory.done||(!memory.due&&!memory.birthday)){await cancelReminder(memory.id);return false}
  const channelId=memory.reminderSound===false?'reminders-silent':'reminders';
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync(channelId,{name:'Reminders',importance:Notifications.AndroidImportance.HIGH,sound:memory.reminderSound===false?null:'default'});
  let permission=await Notifications.getPermissionsAsync();if(!permission.granted)permission=await Notifications.requestPermissionsAsync();if(!permission.granted)return false;
  let trigger:Notifications.NotificationTriggerInput;
  if(memory.topic==='ימי הולדת'&&memory.birthday){const d=parseDay(memory.birthday);if(!d)throw Error('Invalid birthday');if(memory.remindBeforeDays===1)d.setDate(d.getDate()-1);trigger=Platform.OS==='ios'?{type:Notifications.SchedulableTriggerInputTypes.CALENDAR,month:d.getMonth()+1,day:d.getDate(),hour:9,minute:0,repeats:true}:{type:Notifications.SchedulableTriggerInputTypes.YEARLY,month:d.getMonth()+1,day:d.getDate(),hour:9,minute:0,channelId};}
  else{const date=parseDue(memory.due);if(date&&memory.remindBeforeDays===1)date.setDate(date.getDate()-1);if(!date||date<=new Date()){await cancelReminder(memory.id);return false}trigger={type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId};}
  await cancelReminder(memory.id);
  await Notifications.scheduleNotificationAsync({identifier:'memory-'+memory.id,content:{title:memory.topic==='ימי הולדת'?'יום הולדת · '+memory.title:memory.title,body:memory.intent||memory.note||memory.why||'זמן לחזור למה ששמרת',sound:memory.reminderSound===false?false:true,data:{memoryId:memory.id}},trigger});return true;
}
/** Ids of memories with a reminder scheduled on this device. The account never stores this per-device state. */
export async function scheduledReminderIds():Promise<Set<string>>{const scheduled=await Notifications.getAllScheduledNotificationsAsync();return new Set(scheduled.map(n=>n.identifier).filter(id=>id.startsWith('memory-')).map(id=>id.slice('memory-'.length)));}
