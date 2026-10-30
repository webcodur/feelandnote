// Measure selection priority without excluding short service reviews or rewriting them.
const segmenter = new Intl.Segmenter('ko', {granularity:'sentence'});

export function blogReviewEligibility(value) {
  const body=String(value??'')
    .replace(/^\s*(?:출처|source)\s*[:：].*$/gmi,'')
    .replace(/https?:\/\/\S+/gu,'')
    .replace(/<[^>]*>/g,' ')
    .replace(/^[ \t]*[-_─━—]{3,}[ \t]*$/gm,'')
    .replace(/[*_`#]/g,'')
    .replace(/\s+/gu,' ').trim();
  const characters=[...body].length;
  const sentences=[...segmenter.segment(body)].filter(s=>/[\p{L}\p{N}]/u.test(s.segment)).length;
  const issues=characters&&sentences?[]:['empty-review'];
  return {eligible:issues.length===0,characters,sentences,issues};
}
export const hasEligibleBlogReview=value=>blogReviewEligibility(value).eligible;
export function compareBlogReviewPriority(a,b){
  const first=blogReviewEligibility(a.review),second=blogReviewEligibility(b.review);
  return second.characters-first.characters||second.sentences-first.sentences;
}
