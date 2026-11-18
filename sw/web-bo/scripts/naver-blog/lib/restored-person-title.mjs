export function restoredPersonTitle(original,person,total,{prefix=null}={}){
 if(!Number.isInteger(total)||total<1)throw Error('Current public book count required');
 const clean=String(original??'').replace(/\[([^\]]+)\]/g,'『$1』').trim();
 // 새 형식(「…의 추천도서·읽은 책 N권」)과 옛 형식(「…가 읽은 N권의 책」) 모두에서 앞의 수식어·이름을 읽는다.
 const found=clean.match(/^(.+?)의\s*추천도서·읽은 책/)??clean.match(/^(.+?)(?:가|이)\s*(?:(?:지금까지|생전에|직접|평생|가장|지금껏)\s*)?(?:추천|읽|권하|아끼|선정)/);
 let identity=prefix||found?.[1]?.trim().replace(/의\s*독서와\s*그$/,'');
 if(!identity||identity===person.nickname)identity=[person.title?.replace(/ 설립$/,' 창업자'),person.nickname].filter(Boolean).join(' ');
 if(!identity||!person.nickname_en?.trim())throw Error('Existing identity and English name required');
 // 서비스 인물 페이지 제목과 같은 말을 쓴다(26.11.17 사용자 지시: 검색어 「추천도서」가 제목에 들어가게 한다).
 return identity+'의 추천도서·읽은 책 '+total+'권 ('+person.nickname_en.trim()+')';
}
