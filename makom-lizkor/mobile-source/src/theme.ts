export type ThemeName='halloween'|'classic';
/** Halloween look is on by default from 20 October to 2 November (local time) every year. */
export function defaultTheme(now:Date=new Date()):ThemeName{const m=now.getMonth(),d=now.getDate();return (m===9&&d>=20)||(m===10&&d<=2)?'halloween':'classic'}
/** "Personal archive" look: warm paper, ink text and one terracotta accent (the key keeps its historic name `orange`). */
export const CLASSIC={bg:'#f3ede3',panel:'#fbf8f2',field:'#fffdf9',line:'#ddd3c3',text:'#1f1a15',muted:'#6b6157',orange:'#a84a22',soft:'#ebe1d2',ink2:'#40372e',side:'#ece4d7'};
/** Each topic gets a quiet ink colour instead of a symbol. */
export const TOPIC_COLORS:Record<string,string>={'אישי':'#a84a22','משפחה':'#86506f','עבודה':'#3e5c76','רעיונות':'#9a7424','טיולים':'#4f7356','ימי הולדת':'#9c3d4e','לימודים':'#565b8a'};
export const topicColor=(name:string)=>TOPIC_COLORS[name]||'#6b6157';
/** Fonts are hosted with the site (public/fonts); native builds use the system fonts. */
export const FONTS={serif:'"Frank Ruhl Libre", "Noto Serif Hebrew", Georgia, serif',sans:'Assistant, "Noto Sans Hebrew", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'};
const HEX=/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const h2=(n:number)=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');
function toHsl(r:number,g:number,b:number):[number,number,number]{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;if(max===min)return [0,0,l];const d=max-min,s=l>0.5?d/(2-max-min):d/(max+min);const h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;return [h*60,s,l]}
function fromHsl(h:number,s:number,l:number):[number,number,number]{const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return [(r+m)*255,(g+m)*255,(b+m)*255]}
/** Shifts a dark neutral colour towards deep purple and warm colours towards pumpkin orange. Light text is left alone. */
export function halloweenColor(input:string):string{
  const m=HEX.exec(input);if(!m)return input;
  let hex=m[1];if(hex.length<=4)hex=hex.split('').map(c=>c+c).join('');
  const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16),alpha=hex.length===8?hex.slice(6,8):'';
  let [h,s,l]=toHsl(r,g,b);
  if(l>0.82)return input;
  if(s<0.2){h=272;s=l<0.2?0.5:l<0.35?0.4:0.3}
  else if(h<=60||h>=345){h=h>=345?h-360:h;h=Math.max(12,Math.min(40,h*0.5+11));s=Math.min(1,s*1.15+0.1);if(l>0.55)l-=0.05}
  else return input;
  const [nr,ng,nb]=fromHsl(h,s,l);
  return '#'+h2(nr)+h2(ng)+h2(nb)+alpha;
}
export const HALLOWEEN=Object.fromEntries(Object.entries(CLASSIC).map(([k,v])=>[k,halloweenColor(v)])) as typeof CLASSIC;
export const PALETTES:Record<ThemeName,typeof CLASSIC>={classic:CLASSIC,halloween:HALLOWEEN};
export const ICONS:Record<ThemeName,Record<string,string>>={
  classic:{'אישי':'●','משפחה':'●','עבודה':'●','רעיונות':'●','טיולים':'●','ימי הולדת':'●','לימודים':'●'},
  halloween:{'אישי':'👻','משפחה':'🦇','עבודה':'🕸️','רעיונות':'🔮','טיולים':'🏚️','ימי הולדת':'🎂','לימודים':'📜'}
};
/** Returns a copy of a style map with every #hex colour value recoloured for the theme. */
export function themeStyles<T>(styles:T,theme:ThemeName):T{
  if(theme==='classic')return styles;
  const walk=(value:unknown):unknown=>typeof value==='string'?halloweenColor(value):Array.isArray(value)?value.map(walk):value&&typeof value==='object'?Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,walk(v)])):value;
  return walk(styles) as T;
}
