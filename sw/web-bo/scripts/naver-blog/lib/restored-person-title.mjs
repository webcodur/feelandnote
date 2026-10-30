export function restoredPersonTitle(original,person,total,{prefix=null}={}){
 if(!Number.isInteger(total)||total<1)throw Error('Current public book count required');
 const clean=String(original??'').replace(/\[([^\]]+)\]/g,'『$1』').trim();
 const found=clean.match(/^(.+?)(?:가|이)\s*(?:(?:지금까지|생전에|직접|평생|가장|지금껏)\s*)?(?:추천|읽|권하|아끼|선정)/);
 let identity=prefix||found?.[1]?.trim().replace(/의\s*독서와\s*그$/,'');
 if(!identity||identity===person.nickname)identity=[person.title?.replace(/ 설립$/,' 창업자'),person.nickname].filter(Boolean).join(' ');
 if(!identity||!person.nickname_en?.trim())throw Error('Existing identity and English name required');
 const last=identity.charCodeAt(identity.length-1),particle=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28?'이':'가';
 return identity+particle+' 읽은 '+total+'권의 책 ('+person.nickname_en.trim()+')';
}
