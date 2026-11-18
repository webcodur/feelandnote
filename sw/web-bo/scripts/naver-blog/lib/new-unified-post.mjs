import {celebSlug} from './roster-data.mjs';
import {CELEB_CATEGORY} from './celeb-categories.mjs';
import {compileUnifiedArticle,UNIFIED_ARTICLE} from './unified-article.mjs';
import {blogReviewEligibility} from './blog-review-eligibility.mjs';

export function validateNewUnifiedMaterial(material,{posts,drafts}){
  const config=material.newPost,slug=celebSlug(material.serviceUrl);
  if(material.kind!=='celeb'||material.logNo!=='0'||!slug||config?.slug!==slug||config.reviewed!==true)throw Error('Reviewed new person material required');
  if(!CELEB_CATEGORY[config.profession]||config.category!==CELEB_CATEGORY[config.profession])throw Error('Exact profession category required');
  // 소개 책은 다섯 권이 상한이지 요건이 아니다(26.11.13 사용자 지시). 다섯 권 미만이면 compileUnifiedArticle이 selection.eligibleBooks와 권수 일치를 검사한다.
  if(material.selection?.method!=='new-reviewed-selection'||!material.books?.length||material.books.length>UNIFIED_ARTICLE.maxBooks)throw Error('One to five reviewed service books required');
  for(const book of material.books){if(!blogReviewEligibility(book.review).eligible)throw Error('Missing service review: '+book.title);}
  if(!Array.isArray(config.tags)||config.tags.length<3||config.tags.some(t=>typeof t!=='string'||!t.trim()||/\s/.test(t)))throw Error('Explicit compact tags required');
  if(posts.some(p=>p.kind==='celeb'&&!['deleted','private','replaced','skip'].includes(p.link)&&[p.slug,p.url].some(v=>celebSlug(v)===slug))||drafts.some(d=>[d.slug,d.target,d.url].some(v=>celebSlug(v)===slug)))throw Error('Person already has a post, reservation or draft: '+slug);
  const article=compileUnifiedArticle(material);
  if(article.title.length>90)throw Error('Naver title exceeds 90 characters');
  return article;
}

export function finalizeNewUnifiedMaterial(material,logNo){
  if(!/^[1-9]\d+$/.test(String(logNo)))throw Error('Actual Naver post number required');
  const final=structuredClone(material);final.logNo=String(logNo);delete final.titleRevision;
  return {material:final,article:compileUnifiedArticle(final)};
}
