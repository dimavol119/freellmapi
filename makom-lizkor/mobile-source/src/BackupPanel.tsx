import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,StyleSheet,Platform} from 'react-native';
import {CLASSIC as C,FONTS} from './theme';
const SERIF=Platform.OS==='web'?FONTS.serif:undefined,SANS=Platform.OS==='web'?FONTS.sans:undefined;
import {Memory} from './model';
import {useI18n} from './LanguageProvider';
import {recoverMemories} from './backup';
import {pickBackup,exportBackup,saveBackupToCloud} from './services/export';
import {listCloudBackups,readCloudBackup,accountErrorMessage,AccountError} from './services/account';

export function BackupPanel({items,user,busy,blocked,onBusy,onSave}:{items:Memory[];user:{id:string;email:string}|null;busy:boolean;blocked:boolean;onBusy:(b:boolean)=>void;onSave:(items:Memory[])=>Promise<Memory[]>}){
 const {t}=useI18n();const [versions,setVersions]=useState<number[]|null>(null),[preview,setPreview]=useState<Memory[]|null>(null),[message,setMessage]=useState('');
 const running=useRef(false),owner=useRef(user?.id);owner.current=user?.id;
 useEffect(()=>{setVersions(null);setPreview(null);setMessage('')},[user?.id]);
 const disabled=busy||blocked;
 const action=async(fn:()=>Promise<void>)=>{if(disabled||running.current)return;running.current=true;onBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof AccountError?accountErrorMessage(e):(e as Error).message==='INVALID_BACKUP'?'זה אינו קובץ גיבוי תקין של מקום לזכור.':(e as Error).message==='BACKUP_TOO_LARGE'?'קובץ הגיבוי או מספר הפריטים גדולים מדי.':(e as Error).name==='AbortError'?'הפעולה בוטלה.':'הפעולה לא הושלמה. הפריטים הקיימים לא נמחקו.')}finally{running.current=false;onBusy(false)}};
 const button=(label:string,fn:()=>Promise<void>,primary=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={()=>void action(fn)} style={[styles.button,primary&&styles.primary,disabled&&{opacity:.45}]}><Text style={[styles.buttonText,primary&&{color:C.bg}]}>{t(label)}</Text></Pressable>;
 const stage=async(read:()=>Promise<Memory[]|null>)=>{const id=owner.current;const data=await read();if(id!==owner.current)throw new AccountError('SESSION_CHANGED');if(data)setPreview(data)};
 return <View style={styles.panel}>
  <Text style={styles.title}>{t('שמירה וגיבויים')}</Text>
  <Text style={styles.text}>{user?t('הפריטים נשמרים בחשבון האישי:'):t('הפריטים נשמרים במכשיר הזה בלבד. התחבר כדי לשמור בחשבון.')}</Text>
  {user&&<Text style={styles.email}>{user.email}</Text>}
  <Text style={styles.text}>{t('גיבוי נוסף ב־Drive או ב־iCloud שומר עותק אצלך. השמירה מתבצעת דרך קובץ, ביוזמתך.')}</Text>
  {button('הורדת קובץ גיבוי',async()=>{await exportBackup(items);setMessage('קובץ הגיבוי הוכן. ודא ששמרת אותו במקום בטוח.')},true)}
  {(['google','icloud'] as const).map(provider=><View key={provider}>{button(provider==='google'?'שמירת קובץ ב־Google Drive':'שמירת קובץ ב־iCloud Drive',async()=>{const result=await saveBackupToCloud(items,provider);setMessage(result==='shared'?'חלון השיתוף נסגר. ודא שהקובץ נשמר בענן שבחרת.':'הקובץ הורד. העלה אותו ל־Drive או ל־iCloud כדי להשלים את הגיבוי.')})}</View>)}
  <Text style={styles.text}>{t('בטלפון: בחר Drive או שמירה בקבצים בחלון השיתוף. אין העלאה אוטומטית לענן החיצוני.')}</Text>
  {button('שחזור מקובץ גיבוי',()=>stage(pickBackup))}
  <Text style={styles.text}>{t('בחר קובץ JSON מההורדות, מ־Drive או מ־iCloud. השחזור מוסיף פריטים ושומר גם את הקיימים.')}</Text>
  {user&&<>
   <Text style={styles.title}>{t('גרסאות קודמות בחשבון')}</Text>
   <Text style={styles.text}>{t('נשמרות עד שלוש גרסאות קודמות, החל מהעדכון הזה. זה אינו גיבוי קבוע; שמור גם קובץ חיצוני.')}</Text>
   {button('הצגת גרסאות לשחזור',async()=>setVersions(await listCloudBackups()))}
   {versions?.length===0&&<Text style={styles.text}>{t('עדיין אין גרסאות קודמות בחשבון.')}</Text>}
   {versions?.map(version=><View key={version}>{button(t('גרסה')+' '+version,()=>stage(()=>readCloudBackup(version)))}</View>)}
  </>}
  {preview&&<View style={styles.preview}>
   <Text style={styles.title}>{t('בדיקה לפני שחזור')}</Text><Text style={styles.text}>{t('פריטים בקובץ:')} {preview.length}</Text>
   <Text style={styles.text}>{t('כפילויות זהות ידולגו. פריט ששונה יתווסף כעותק, בלי לדרוס את הקיים. תזכורות דורשות קביעה מחדש.')}</Text>
   {preview.slice(0,4).map(i=><Text key={i.id} numberOfLines={1} style={styles.text}>• {i.title}</Text>)}
   {button('הוספת הפריטים מהגיבוי',async()=>{const recovered=recoverMemories(items,preview);await onSave(recovered);setPreview(null);setVersions(null);setMessage('השחזור נשמר. הפריטים הקיימים נשמרו גם הם.')},true)}
   {button('ביטול השחזור',async()=>setPreview(null))}
  </View>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={styles.message}>{t(message)}</Text>}
 </View>;
}
const styles=StyleSheet.create({panel:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:14,padding:22,gap:12},title:{fontFamily:SERIF,color:C.text,fontSize:21,fontWeight:'700',textAlign:'auto'},text:{fontFamily:SANS,color:C.ink2,fontSize:15,lineHeight:24,textAlign:'auto'},email:{fontFamily:SANS,color:C.text,textAlign:'left',fontSize:15},button:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:10,paddingVertical:11,paddingHorizontal:14,alignItems:'center',minHeight:42,justifyContent:'center'},primary:{backgroundColor:C.text,borderColor:C.text},buttonText:{fontFamily:SANS,color:C.text,fontSize:14.5,fontWeight:'600'},preview:{padding:16,borderWidth:1,borderColor:C.orange,borderRadius:12,gap:12,backgroundColor:C.field},message:{fontFamily:SANS,color:C.orange,fontSize:15,lineHeight:23}});
