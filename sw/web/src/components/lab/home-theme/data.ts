import 'server-only';
import { createStaticClient } from '@/lib/db/static';
import type { HomeThemeBook, HomeThemeData, HomeThemePerson } from './types';

const SLUGS = ['jeff-bezos', 'bill-gates', 'kim-soo-hyun', 'kim-hye-soo', 'josh-brolin', 'salma-hayek'];
const BOOKS = ['성공하는 기업들의 8가지 습관', '좋은 기업을 넘어 위대한 기업으로', '플레바스를 생각하라', '블랙 스완'];
interface LocaleRow { locale: string; title: string | null; creator: string | null; thumbnail_url: string | null; isbn: string | null; affiliate_url: unknown }
interface RecordRow {
  content_id: string; celeb_id: string | null; review: string | null; review_en: string | null; source_url: string | null;
  contents: { content_locales: LocaleRow[] } | null;
}

/** 시안과 같은 예시 편성. 표지·리뷰·출처·구매 정보는 현재 공개 DB에서 읽는다. */
export async function getHomeThemeData(locale: 'ko' | 'en'): Promise<HomeThemeData> {
  const db = createStaticClient();
  const { data: profiles, error } = await db.from('celebs')
    .select('id,slug,nickname,nickname_en,avatar_url,headline,headline_en,bio,bio_en').in('slug', SLUGS).eq('publication_status', 'active');
  if (error || !profiles) throw new Error('Home theme profile read failed');
  const people: HomeThemePerson[] = profiles.map(profile => ({
    id: profile.id, slug: profile.slug!, name: locale === 'en' ? profile.nickname_en || profile.nickname || profile.slug! : profile.nickname || profile.slug!, avatarUrl: profile.avatar_url,
    headline: locale === 'en' ? profile.headline_en : profile.headline,
    bio: locale === 'en' ? profile.bio_en : profile.bio,
  }));
  const today = people.find(person => person.slug === 'jeff-bezos');
  const featuredPerson = people.find(person => person.slug === 'bill-gates');
  if (!today || !featuredPerson) throw new Error('Home theme sample profiles unavailable');
  const query = (id: string) => db.from('celeb_contents')
    .select('content_id,celeb_id,review,review_en,source_url,contents(content_locales(locale,title,creator,thumbnail_url,isbn,affiliate_url))')
    .eq('celeb_id', id).eq('status', 'FINISHED').eq('visibility', 'public').eq('is_spoiler', false).limit(200);
  const [todayResult, featuredResult] = await Promise.all([query(today.id), query(featuredPerson.id)]);
  if (todayResult.error || featuredResult.error) throw new Error('Home theme public review read failed');
  const todayRecords = todayResult.data as unknown as RecordRow[];
  const featuredRecords = featuredResult.data as unknown as RecordRow[];
  const koTitle = (record: RecordRow) => record.contents?.content_locales.find(item => item.locale === 'ko')?.title;
  const toBook = (record: RecordRow): HomeThemeBook | null => {
    const rows = record.contents?.content_locales ?? [];
    const meta = rows.find(item => item.locale === locale && item.title) ?? rows.find(item => item.locale === 'ko' && item.title);
    const review = locale === 'en' ? record.review_en || record.review : record.review;
    if (!meta?.title || !review) return null;
    // 같은 작품의 다른 언어 표지는 표시용으로만 빌린다. 구매 판본의 ISBN·언어는 meta 그대로 둔다.
    const cover = meta.thumbnail_url ? meta : rows.find(item => item.thumbnail_url);
    return { id: record.content_id, title: meta.title, creator: meta.creator, thumbnailUrl: cover?.thumbnail_url ?? null,
      coverLocale: cover ? cover.locale === 'en' ? 'en' : 'ko' : null,
      review, sourceUrl: record.source_url, isbn: meta.isbn, bookLocale: meta.locale === 'en' ? 'en' : 'ko', affiliateUrl: meta.affiliate_url };
  };
  const books = BOOKS.flatMap(title => {
    const record = todayRecords.find(item => koTitle(item) === title);
    const book = record && toBook(record);
    return book ? [book] : [];
  });
  const featuredRecord = featuredRecords.find(record => koTitle(record) === '슈독');
  const featuredBook = featuredRecord && toBook(featuredRecord);
  if (!books.length || !featuredBook) throw new Error('Home theme sample books unavailable');
  return { today, books, featured: { person: featuredPerson, book: featuredBook }, people: SLUGS.slice(2).flatMap(slug => people.filter(person => person.slug === slug)) };
}
