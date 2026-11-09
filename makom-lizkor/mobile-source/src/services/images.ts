import * as ImagePicker from 'expo-image-picker';
import {fitSize,shouldShrink,MAX_IMAGE_SIDE} from '../image-size';
const QUALITY=0.82;
/** Phone photos are several MB each and the whole account is limited to 20 MB, so shrink them in the browser before saving. */
export async function pickImages():Promise<string[]>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,quality:0.85,base64:true});if(r.canceled)return [];const originals=r.assets.filter(a=>a.base64).map(a=>'data:'+(a.mimeType||'image/jpeg')+';base64,'+a.base64);const result:string[]=[];for(const uri of originals)result.push(await shrinkImage(uri));return result}
/** Returns a smaller JPEG copy when that helps; on any failure (e.g. a format the browser cannot decode) keeps the original. */
export async function shrinkImage(uri:string):Promise<string>{
 if(typeof document==='undefined'||!shouldShrink(uri))return uri;
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new window.Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('DECODE'));img.src=uri});
  const {width,height}=fitSize(image.naturalWidth,image.naturalHeight,MAX_IMAGE_SIDE);if(!width||!height)return uri;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)return uri;
  context.fillStyle='#ffffff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
  const smaller=canvas.toDataURL('image/jpeg',QUALITY);
  return smaller.startsWith('data:image/jpeg;base64,')&&smaller.length<uri.length?smaller:uri;
 }catch{return uri}
}
