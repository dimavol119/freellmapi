import * as ImagePicker from 'expo-image-picker';
export async function pickImages():Promise<string[]>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,quality:0.85,base64:true});if(r.canceled)return [];return r.assets.filter(a=>a.base64).map(a=>'data:'+(a.mimeType||'image/jpeg')+';base64,'+a.base64);}
