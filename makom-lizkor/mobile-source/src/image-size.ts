export const MAX_IMAGE_SIDE=1600;
const KEEP_BELOW=400*1024;
/** Scales down (never up) so the longer side is at most `max`, keeping the aspect ratio. */
export function fitSize(width:number,height:number,max=MAX_IMAGE_SIDE):{width:number;height:number}{
 if(!(width>0)||!(height>0))return {width:0,height:0};
 const scale=Math.min(1,max/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
/** Small images and animated GIFs are kept as they are. */
export function shouldShrink(uri:string):boolean{
 const match=/^data:image\/([a-z]+);base64,/.exec(uri);if(!match||match[1]==='gif')return false;
 return (uri.length-match[0].length)*0.75>KEEP_BELOW;
}
