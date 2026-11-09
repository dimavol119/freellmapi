import type {Memory} from './model';
const stable=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const same=(a:Memory,b:Memory)=>stable(a)===stable(b);
/**
 * Three-way merge of two devices' edits. `base` is the last state this device synced, `mine` is this device's
 * list, `theirs` is the server's current list. Per item: one-sided changes win; an edit beats a deletion, so
 * nothing is lost silently; if both sides edited the same item, each field takes whichever side changed it,
 * and this device wins when both changed the same field.
 */
export function mergeMemories(base:Memory[],mine:Memory[],theirs:Memory[]):Memory[]{
  const B=new Map(base.map(i=>[i.id,i])),M=new Map(mine.map(i=>[i.id,i])),T=new Map(theirs.map(i=>[i.id,i]));
  const pick=(id:string):Memory|undefined=>{
    const b=B.get(id),m=M.get(id),t=T.get(id);
    if(!b)return m??t;
    const mineChanged=!m||!same(b,m),theirsChanged=!t||!same(b,t);
    if(!mineChanged&&!theirsChanged)return b;
    if(!theirsChanged)return m;
    if(!mineChanged)return t;
    if(!m)return t;
    if(!t)return m;
    const out:Record<string,unknown>={...t},bb=b as unknown as Record<string,unknown>,mm=m as unknown as Record<string,unknown>,tt=t as unknown as Record<string,unknown>;
    for(const key of new Set([...Object.keys(bb),...Object.keys(mm),...Object.keys(tt)])){
      if(stable(mm[key])!==stable(bb[key])){if(mm[key]===undefined)delete out[key];else out[key]=mm[key]}
      else if(tt[key]===undefined)delete out[key];else out[key]=tt[key];
    }
    return out as unknown as Memory;
  };
  const order=[...new Set([...mine.map(i=>i.id).filter(id=>!T.has(id)),...theirs.map(i=>i.id)])];
  return order.map(pick).filter((i):i is Memory=>!!i);
}
/** Saves `mine`; on a conflict fetches the latest list, merges, and retries. Returns whether a merge happened. */
export async function saveWithMerge(opts:{mine:Memory[];base:Memory[];put:(items:Memory[])=>Promise<void>;latest:()=>Promise<Memory[]>;isConflict:(error:unknown)=>boolean;attempts?:number}):Promise<{items:Memory[];merged:boolean}>{
  let {mine,base}=opts,merged=false,last:unknown=new Error('CONFLICT');
  for(let i=0;i<(opts.attempts??4);i++){
    try{await opts.put(mine);return {items:mine,merged}}
    catch(e){if(!opts.isConflict(e))throw e;last=e;const theirs=await opts.latest();mine=mergeMemories(base,mine,theirs);base=theirs;merged=true}
  }
  throw last;
}
