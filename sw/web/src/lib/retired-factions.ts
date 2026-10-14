import { ATLAS_GROUP_PARAM, ATLAS_PERSON_PARAM } from '@/components/features/user/explore/myth/atlasNavigationData';

/** 폐기한 세력의 옛 주소를 연결한다. 명단·개요·장면은 옮긴 세력의 그룹이 쥔다. */
const cinema = { id: 'a186f467-50e4-416d-96b7-9f61b003bb91', slug: 'cinema', name: '시네마', nameEn: 'Cinema' };
const coldWar = { id: '374b2b54-31f6-4bb3-ab16-6fe4af05ea90', slug: 'cold-war', name: '냉전', nameEn: 'Cold War' };
// 폐기한 직업·국가별 대기 명단의 주소만 보존한다. 인물 데이터는 삭제하지 않는다.
const discardedFactions = [
  { id: '37e50649-0004-4992-bfa3-10e2997f0085', slug: 'eccentric-fortunes' },
  { id: '0358e2a8-62f7-43ee-82a4-b851b44a38df', slug: 'great-inventors' },
  { id: '0be1860d-9d53-44a7-9998-59b8094079af', slug: 'soldiers-of-fortune' },
  { id: 'c8f438a3-5a9f-4053-8b10-077746a38987', slug: 'economists' },
  { id: '0ff53978-5640-45d2-972b-044e9dfdb646', slug: 'crime-lords' },
  { id: '98d9c482-98e9-44cd-9180-50705c1ac253', slug: 'electronic-dance-music' },
  { id: '7cd002ec-369e-49f0-ab87-bd7a32e52232', slug: 'scientists' },
  { id: '3e8d5364-6887-45a8-a00c-9e44db28baad', slug: 'fashion-models' },
  { id: '7cdc197f-6d6c-4d03-8486-349504ba4ae4', slug: 'classical-music' },
  { id: '3e7c9b7a-22b7-45ab-805c-a1ed73f8d425', slug: 'mad-scientists' },
  { id: '502c38d9-3cb3-4f4d-9e8f-91b3d14de84a', slug: 'visual-artists' },
  { id: 'c294e8f6-20fe-4c10-abed-f001fac7c879', slug: 'business-leaders' },
  { id: 'b3ef4a3e-c17f-4e79-bc2e-e2c98a3a91c4', slug: 'software-legends' },
  { id: 'e321b4a6-dfca-4ca1-988f-b069f97d7c77', slug: 'computing-pioneers' },
  { id: 'afefd078-7032-409c-8d73-b87386ede8ba', slug: 'native-americans' },
  { id: '633ed3b7-d2cf-46f5-ab2a-97046ed489e9', slug: 'game-masters' },
  { id: 'b39443b5-56bb-42d4-8621-f96d83911540', slug: 'impostors-and-mysteries' },
  { id: 'a284edcb-ca4e-4c73-9bb9-198426922ce5', slug: 'south-asian-music' },
  { id: '8c35b51e-a684-469a-a949-f473beea94f7', slug: 'gag-concert' },
  { id: '129ec7f6-6b34-46d3-be32-097aff9dec21', slug: 'european-monarchs' },
  { id: 'e029516a-1bcf-4fb3-b5c6-648048760700', slug: 'chefs' },
] as const;

export function isDiscardedFaction(reference: string) {
  return discardedFactions.some(item => item.id === reference || item.slug === reference);
}
const retiredFactions = [
  { id: '15b98aa8-6372-48bd-a6ce-a365c2147a07', slug: 'hollywood-blacklist', group: '할리우드 블랙리스트', groupEn: 'Hollywood Blacklist' },
  { id: '799450d5-6671-43af-9c22-2f886e1de8fd', slug: 'dogme-95', group: '도그마 95', groupEn: 'Dogme 95' },
  { id: 'd843e24d-77a9-4b1c-8f25-6bc84ef28fc2', slug: 'french-new-wave', group: '누벨바그', groupEn: 'French New Wave' },
] as const;

export function retiredFactionTarget(reference: string) {
  const retired = retiredFactions.find(item => item.id === reference || item.slug === reference);
  if (retired) return { ...cinema, group: retired.group, groupEn: retired.groupEn };
  if (reference === '59f23ca9-00a3-473a-ab5f-41dfba6c381d' || reference === 'cold-war-frontlines') {
    return { ...coldWar, group: '냉전의 현장', groupEn: 'Cold War operations and crises' };
  }
  return null;
}

/** 과거 slug·UUID 주소와 ?tag=·?faction= 링크를 언어·인물 선택을 유지해 연결한다. */
export function retiredFactionHref(pathname: string, searchParams: URLSearchParams): string | null {
  const match = pathname.match(/^\/(?:(ko|en)\/)?explore\/faction(?:\/([^/]+))?\/?$/);
  if (!match) return null;
  const reference = match[2] ?? searchParams.get('faction') ?? searchParams.get('tag');
  if (reference && isDiscardedFaction(reference)) {
    const query = new URLSearchParams(searchParams);
    for (const key of ['tag', 'faction', ATLAS_GROUP_PARAM, ATLAS_PERSON_PARAM]) query.delete(key);
    return `${match[1] === 'en' ? '/en' : ''}/explore/faction${query.size ? `?${query}` : ''}`;
  }
  const target = reference ? retiredFactionTarget(reference) : null;
  if (!target) return null;
  const query = new URLSearchParams(searchParams);
  query.delete('tag');
  query.delete('faction');
  query.set(ATLAS_GROUP_PARAM, target.group);
  return `${match[1] === 'en' ? '/en' : ''}/explore/faction/${target.slug}?${query}`;
}
