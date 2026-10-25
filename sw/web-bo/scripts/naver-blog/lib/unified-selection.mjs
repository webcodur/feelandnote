const sameIds=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());

export function selectionCandidate(answer,books,maxBooks=5){
 const ids=answer.selectedContentIds,available=new Set(books.map(b=>b.content_id));
 if(!Array.isArray(ids)||!ids.length||ids.length>Math.min(maxBooks,available.size)||new Set(ids).size!==ids.length||ids.some(id=>!available.has(id)))throw Error('AGY book selection identity/coverage differs');
 const needsReview=ids.length<Math.min(maxBooks,available.size);
 const excludedIds=[...available].filter(id=>!ids.includes(id));
 if(needsReview&&excludedIds.some(id=>!answer.reasons?.some(r=>r.content_id===id&&typeof r.reason==='string'&&r.reason.trim())))throw Error('Every excluded book needs an evidence reason');
 return{ids,excludedIds,needsReview};
}

export function assertSelectionReview(candidate,review){
 if(review?.pass!==true||review.noAdditionalEligibleBooks!==true||!Array.isArray(review.issues)||review.issues.length||!Array.isArray(review.selectedContentIds)||!Array.isArray(review.excludedContentIds)||!sameIds(candidate.ids,review.selectedContentIds)||!sameIds(candidate.excludedIds,review.excludedContentIds))throw Error('Insufficient-book selection has not passed independent review');
}
