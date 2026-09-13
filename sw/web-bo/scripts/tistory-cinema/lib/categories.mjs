import { POST_CATEGORIES } from './schedule.mjs';

const PROFESSIONS = Object.freeze({
  entrepreneur: '기업가', investor: '투자자', politician: '정치인',
  scientist: '학자', social_scientist: '학자', humanities_scholar: '학자',
  actor: '배우', author: '작가', musician: '아티스트', visual_artist: '아티스트',
  athlete: '스포츠인', influencer: '인플루언서', director: '영화감독',
  commander: '군인', leader: '지도자',
});
const CURATORS = Object.freeze({
  media: '언론매체', award: '시상기관', organization: '단체', festival: '영화제',
});

export const CATEGORY_TREE = Object.freeze([
  { name: POST_CATEGORIES.person, children: ['기업가', '투자자', '정치인', '학자', '배우', '작가', '아티스트', '스포츠인', '인플루언서', '영화감독', '군인', '지도자'] },
  { name: POST_CATEGORIES.work, children: ['드라마', '액션', '모험', '범죄', '코미디', 'SF', '판타지', '공포', '스릴러', '미스터리', '로맨스', '애니메이션', '가족', '전쟁', '역사', '서부', '음악', '다큐멘터리'] },
  { name: POST_CATEGORIES.list, children: ['교육기관', '언론매체', '시상기관', '대중투표', '서점', '도서관', '단체', '영화제'] },
].map((node) => Object.freeze({ ...node, children: Object.freeze(node.children) })));

/** 재료의 직군·첫 장르·기관 유형으로 하나의 하위 분류를 정한다. */
export function categoryPathForMaterial(material) {
  const kinds = ['celeb', 'work', 'list'].filter((key) => material?.[key]);
  if (kinds.length !== 1) throw new Error('카테고리를 정할 재료 유형이 하나여야 한다.');
  let kind, leaf;
  if (material.celeb) {
    kind = 'person';
    const person = material.celeb;
    // 재료의 소개가 마피아 보스인 루치아노는 commander 값에도 군인으로 분류하지 않는다.
    leaf = person.slug === 'lucky-luciano' || person.id === '203c414d-7860-4e85-9504-430a0e732756'
      ? '지도자' : PROFESSIONS[person.profession];
  } else if (material.work) {
    kind = 'work';
    leaf = material.tmdb?.genres?.[0];
  } else {
    kind = 'list';
    leaf = CURATORS[material.curator?.kind];
  }
  const categoryPath = [POST_CATEGORIES[kind], leaf];
  categoryForMeta({ categoryPath, category: leaf }, kind);
  return categoryPath;
}

/** 누락된 메타를 상위 분류로 대체하지 않는다. 새 분류가 준비되지 않으면 발행 전에 멈춘다. */
export function categoryForMeta(meta, kind) {
  const parts = meta?.categoryPath;
  const node = Array.isArray(parts) && parts.length === 2 && CATEGORY_TREE.find((item) => item.name === parts[0]);
  if (!node || !node.children.includes(parts[1]) || meta.category !== parts[1] || kind && POST_CATEGORIES[kind] !== parts[0]) {
    throw new Error('카테고리 메타가 없거나 두 단계 분류와 맞지 않는다. 재료에서 메타를 다시 생성해야 한다.');
  }
  return parts[1];
}
