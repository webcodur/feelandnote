const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function titleAndFunnelPatch(before,after){
 if(before.kind!=='celeb'||after.kind!=='celeb'||before.logNo!==after.logNo||before.serviceUrl!==after.serviceUrl||!same(before.sources,after.sources)||before.operations.length!==after.operations.length)return null;
 const a=before.operations,b=after.operations,header=a.findIndex(o=>o.kind==='text'&&o.role==='heading'),allowed=new Set([header,a.length-2,a.length-1]),guide=header+1;
 if(header<0||b[header]?.role!=='heading'||a.at(-2)?.kind!=='text'||b.at(-2)?.kind!=='text'||a.at(-1)?.kind!=='link'||b.at(-1)?.kind!=='link'||a.at(-1).href!==before.serviceUrl||b.at(-1).href!==after.serviceUrl)return null;
 if(a[guide]?.kind==='text'&&a[guide].role==='body'&&b[guide]?.gapBefore===false){const x={...a[guide]},y={...b[guide]};delete x.gapBefore;delete y.gapBefore;if(!same(x,y))return null;allowed.add(guide);}
 if(a.some((op,i)=>!allowed.has(i)&&!same(op,b[i])))return null;
 return{replacements:[...allowed].filter(i=>a[i].text!==b[i].text).map(i=>({before:a[i],after:[b[i]]}))};
}
