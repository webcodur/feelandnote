import {celebSlug} from './roster-data.mjs';
import {CELEB_CATEGORY} from './celeb-categories.mjs';
import {compileUnifiedArticle} from './unified-article.mjs';
import {blogReviewEligibility} from './blog-review-eligibility.mjs';

export function validateNewUnifiedMaterial(material,{posts,drafts}){
  const config=material.newPost,slug=celebSlug(material.serviceUrl);
  if(material.kind!=='celeb'||material.logNo!=='0'||!slug||config?.slug!==slug||config.reviewed!==true)throw Error('Reviewed new person material required');
  if(!CELEB_CATEGORY[config.profession]||config.category!==CELEB_CATEGORY[config.profession])throw Error('Exact profession category required');
  if(material.selection?.method!=='new-reviewed-selection'||material.books?.length!==5)throw Error('Five reviewed service books required');
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
