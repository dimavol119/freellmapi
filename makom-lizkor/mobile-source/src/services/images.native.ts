import * as ImagePicker from 'expo-image-picker';
import {Directory,File,Paths} from 'expo-file-system';
export async function pickImages():Promise<string[]>{
  const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,quality:0.85});if(r.canceled)return [];
  const directory=new Directory(Paths.document,'memories');directory.create({idempotent:true,intermediates:true});const copies:string[]=[];
  try{for(const asset of r.assets){const extension=asset.uri.split('.').pop()?.split('?')[0].replace(/[^a-zA-Z0-9]/g,'')||'jpg';const target=new File(directory,Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+extension);new File(asset.uri).copy(target);copies.push(target.uri)}return copies}catch(e){for(const uri of copies){try{new File(uri).delete()}catch{}}throw e}
}
