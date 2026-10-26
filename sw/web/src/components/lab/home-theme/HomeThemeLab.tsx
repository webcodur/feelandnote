'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import PageContainer from '@/components/layout/PageContainer';
import HomeBrandHeader from './HomeThemeBrandHeader';
import HubSection, { HubMoreLink } from '@/components/shared/HubSection';
import hubStyles from '@/components/shared/HubSection.module.css';
import AtlasNavSections from '@/components/shared/atlasNav/AtlasNavSections';
import CelebImage from '@/components/ui/CelebImage';
import ContentImage from '@/components/ui/ContentImage';
import ContentCoverLink from '@/components/shared/ContentCoverLink';
import ContentCoverFallback from '@/components/ui/ContentCoverFallback';
import ContentPurchaseAction from '@/components/features/commerce/ContentPurchaseAction';
import { useMouseDragScroll } from '@/hooks/useMouseDragScroll';
import { getCelebProfileUrl } from '@/lib/url';
import type { HomeThemeBook, HomeThemeData, HomeThemePerson } from './types';
import styles from './HomeThemeLab.module.css';

const PersonContextModal = dynamic(() => import('@/components/shared/BookShelf/BookShelfPersonModal'), { ssr: false });

// 이전 홈의 테마 비교 시안. 서비스 메인의 새 소개·그래프 구성과 독립적으로 보존한다.
const SECTION_IDS: Record<string, string> = {
  todayFigure: 'home-theme-today', featuredReview: 'home-theme-featured', figureLinks: 'home-theme-trending',
};
const SECTIONS = [
  { key: 'todayFigure', titleKey: 'todayFigure', navTitleKey: 'todayFigure' },
  { key: 'featuredReview', titleKey: 'featuredReview', navTitleKey: 'featuredReview' },
  { key: 'figureLinks', titleKey: 'figureLinks', navTitleKey: 'figureLinksNav' },
];
const COPY = {
  ko: {
    lab: '홈 테마 실험', note: '공개 데이터를 사용한 예시 편성', labs: '랩실', current: '현재 홈 비교',
    works: '그가 감상한 작품',
    review: '의 감상', source: '감상 출처', moreReviews: '이 인물의 감상 더 읽기', previous: '이전 작품', next: '다음 작품',
    continue: '감상 이어 읽기', collapse: '감상 접기', morePeople: '인물 더 살펴보기',
    coverKo: '한국어판 표지', coverEn: '영문판 표지',
    context: '인물 소개·감상 배경',
  },
  en: {
    lab: 'Home theme lab', note: 'A sample selection using public records', labs: 'Lab', current: 'Compare current home',
    works: 'Works they experienced',
    review: '’s review', source: 'Review source', moreReviews: 'More from this figure', previous: 'Previous work', next: 'Next work',
    continue: 'Continue reading', collapse: 'Show less', morePeople: 'Explore more people',
    coverKo: 'Korean edition cover', coverEn: 'English edition cover',
    context: 'About the figure & this review',
  },
};

function ReviewText({ text }: { text: string }) {
  return <div className={styles.reviewCopy}>{text.split(/\n\s*\n/).map((paragraph, index) =>
    <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>;
}

function Purchase({ book }: { book: HomeThemeBook }) {
  return <ContentPurchaseAction contentId={book.id} type="BOOK" placement="library-expand" title={book.title} creator={book.creator}
    thumbnail={book.thumbnailUrl} isbn={book.isbn ?? undefined} affiliateUrl={book.affiliateUrl} bookLocale={book.bookLocale} />;
}

function Source({ href, label }: { href: string | null; label: string }) {
  return href && /^https?:\/\//.test(href) ?
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>{label}<ArrowUpRight size={14} aria-hidden /></a> : null;
}

export default function HomeThemeLab({ data, locale }: { data: HomeThemeData; locale: 'ko' | 'en' }) {
  const t = COPY[locale];
  const hubT = useTranslations('home.hub');
  const siteT = useTranslations('site');
  const [index, setIndex] = useState(0);
  const [featuredExpanded, setFeaturedExpanded] = useState(false);
  const [personContext, setPersonContext] = useState<{ person: HomeThemePerson; book: HomeThemeBook } | null>(null);
  const { ref: railRef, cursorClassName, dragProps, stopGlide } = useMouseDragScroll<HTMLDivElement>();
  const selected = data.books[index] ?? data.books[0];
  const featured = data.featured.book;
  const paragraphs = featured.review.split(/\n\s*\n/);
  const items = SECTIONS.map((section, position) => ({
    key: section.key, chapter: String(position + 1).padStart(2, '0'),
    label: hubT(section.navTitleKey ?? section.titleKey), sectionId: SECTION_IDS[section.key],
  }));
  const sectionProps = (key: string) => {
    const position = SECTIONS.findIndex(section => section.key === key);
    const section = SECTIONS[position];
    return { id: SECTION_IDS[key], title: hubT(section.titleKey), index: position, total: SECTIONS.length };
  };
  const select = (next: number) => { stopGlide(); setIndex((next + data.books.length) % data.books.length); };

  return <>
    <AtlasNavSections items={items} />
    <PageContainer width="detail" className={hubStyles.page}>
      <aside className={styles.labBar} aria-label={t.lab}>
        <div><span className={styles.labBadge}>LAB</span><span>{t.lab}</span><small>{t.note}</small></div>
        <nav><Link href="/lab/content-cards">{t.labs}<ArrowUpRight size={13} aria-hidden /></Link>
          <Link href="/" target="_blank" rel="noopener">{t.current}<ArrowUpRight size={13} aria-hidden /></Link></nav>
      </aside>
      <HomeBrandHeader brandHeading={siteT('brandHeading')} brandAlias={siteT('brandAlias')} aboutLabel={hubT('aboutLink')} />
      <div className={styles.theme} data-home-theme-lab>
        <HubSection {...sectionProps('todayFigure')} hideDivider>
          <div className={styles.shelfScene}>
            <div className={styles.figureIntro}>
              <Link href={getCelebProfileUrl(data.today)} className={styles.figurePortrait} aria-label={data.today.name}>
                <CelebImage src={data.today.avatarUrl} alt="" shape="square" dissolve={false} />
              </Link>
              <h3><Link href={getCelebProfileUrl(data.today)}>{data.today.name}</Link></h3>
              {data.today.headline && <p className={styles.figureHeadline}>{data.today.headline}</p>}
              <div className={styles.figureContext}>
                {data.today.bio && <p className={styles.personBio}>{data.today.bio}</p>}
                <button type="button" className={styles.contextButton} aria-haspopup="dialog" aria-label={`${data.today.name}: ${t.context}`}
                  onClick={() => setPersonContext({ person: data.today, book: selected })}>
                  <span>{t.context}</span><ArrowRight size={15} aria-hidden />
                </button>
              </div>
            </div>
            <div className={styles.bookArea}>
              {/* 선택은 표지 테두리로 표시한다. 작품마다 읽기 상태·조작 안내 문구를 반복하지 않는다. */}
              <div ref={railRef} {...dragProps} className={`${styles.shelf} ${cursorClassName}`} aria-label={t.works}>
                {data.books.map((book, position) => <button key={book.id} type="button" className={styles.book} onClick={() => select(position)}
                  aria-pressed={index === position} aria-controls="home-theme-selected-review" aria-label={book.title} title={book.title}>
                  <div className={styles.cover}>{book.thumbnailUrl ? <ContentImage src={book.thumbnailUrl} alt="" className="object-contain object-bottom" sizes="(max-width: 767px) 132px, 190px" loading="eager" dissolve={false} draggable={false} /> : <ContentCoverFallback title={book.title} />}</div>
                  <h4>{book.title}</h4><p>{book.creator}</p>
                  {book.coverLocale && book.coverLocale !== book.bookLocale && <span className={styles.coverNote}>{book.coverLocale === 'ko' ? t.coverKo : t.coverEn}</span>}
                </button>)}
              </div>
              <article id="home-theme-selected-review" className={styles.selectedReview} aria-live="polite" data-selected-review={selected.id}>
                <header className={styles.reviewHeader}>
                  <div><p className={styles.readingLabel}>{data.today.name}{t.review}</p>
                    <h3><Link href={`/content/${selected.id}?category=book`}>{selected.title}</Link></h3>
                  </div>
                  <div className={styles.reviewStepper}><span>{index + 1}<small> / {data.books.length}</small></span>
                    <button type="button" aria-label={t.previous} aria-controls="home-theme-selected-review" onClick={() => select(index - 1)}><ChevronLeft size={16} /></button>
                    <button type="button" aria-label={t.next} aria-controls="home-theme-selected-review" onClick={() => select(index + 1)}><ChevronRight size={16} /></button>
                  </div>
                </header>
                <ReviewText text={selected.review} />
                <footer className={styles.reviewTools}><Source href={selected.sourceUrl} label={t.source} /><Purchase key={selected.id} book={selected} /></footer>
              </article>
              <Link href={getCelebProfileUrl(data.today)} className={styles.moreReviews}>{t.moreReviews}<ArrowRight size={15} aria-hidden /></Link>
            </div>
          </div>
        </HubSection>
        <HubSection {...sectionProps('featuredReview')}>
          {/* 감상한 인물을 먼저 소개한다. 요약 창에서 이 책의 감상 배경까지 확인한 뒤 상세 페이지로 이동할 수 있다. */}
          <div className={styles.featuredIntro}>
            <Link href={getCelebProfileUrl(data.featured.person)} className={styles.reviewerPortrait} aria-label={data.featured.person.name}>
              <CelebImage src={data.featured.person.avatarUrl} alt="" shape="circle" dissolve={false} />
            </Link>
            <div className={styles.reviewerContext}>
              <h3><Link href={getCelebProfileUrl(data.featured.person)}>{data.featured.person.name}{t.review}</Link></h3>
              {data.featured.person.bio && <p className={styles.personBio}>{data.featured.person.bio}</p>}
            </div>
            <button type="button" className={styles.contextButton} aria-haspopup="dialog" aria-label={`${data.featured.person.name}: ${t.context}`}
              onClick={() => setPersonContext({ person: data.featured.person, book: featured })}>
              <span>{t.context}</span><ArrowRight size={15} aria-hidden />
            </button>
          </div>
          <div className={styles.featuredScene}>
            <div className={styles.featuredBook}>
              <ContentCoverLink href={`/content/${featured.id}?category=book`} title={featured.title} imageSrc={featured.thumbnailUrl} contentType="BOOK" className={styles.featuredCover}>
                {featured.thumbnailUrl ? <ContentImage src={featured.thumbnailUrl} alt={featured.title} className="object-contain object-top" sizes="(max-width: 767px) 176px, 216px" dissolve={false} /> : <ContentCoverFallback title={featured.title} />}
              </ContentCoverLink>
              {featured.coverLocale && featured.coverLocale !== featured.bookLocale && <p className={styles.coverNote}>{featured.coverLocale === 'ko' ? t.coverKo : t.coverEn}</p>}
              <p className={styles.creator}>{featured.creator}</p>
              <div className={styles.coverPurchase}><Purchase book={featured} /></div>
            </div>
            <article className={styles.featuredReading}>
              <header className={styles.featuredHeader}>
                <h3><Link href={`/content/${featured.id}?category=book`}>{featured.title}</Link></h3>
              </header>
              <ReviewText text={paragraphs.slice(0, 2).join('\n\n')} />
              {paragraphs.length > 2 && <button type="button" className={styles.readMore} aria-expanded={featuredExpanded} aria-controls="home-theme-extended-review"
                onClick={() => setFeaturedExpanded(value => !value)}>
                <span>{featuredExpanded ? t.collapse : t.continue}</span>{featuredExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>}
              <div id="home-theme-extended-review" className={styles.extendedReview} hidden={!featuredExpanded}>
                {featuredExpanded && <ReviewText text={paragraphs.slice(2).join('\n\n')} />}
              </div>
              <footer className={styles.paperFooter}><Source href={featured.sourceUrl} label={t.source} /></footer>
            </article>
          </div>
        </HubSection>
        <HubSection {...sectionProps('figureLinks')}>
          <div className={styles.people}>{data.people.map(person => <Link key={person.id} href={getCelebProfileUrl(person)} className={styles.personCard}>
            <div className={styles.personStage}><CelebImage src={person.avatarUrl} alt="" shape="square" dissolve={false} /></div>
            <div className={styles.personCaption}><h3>{person.name}</h3>{person.headline && <p>{person.headline}</p>}</div>
          </Link>)}</div>
          <HubMoreLink href="/explore?sortBy=country_trending" label={t.morePeople} />
        </HubSection>
      </div>
    </PageContainer>
    {personContext && <PersonContextModal key={personContext.person.id} person={{
      id: personContext.person.id, slug: personContext.person.slug, name: personContext.person.name,
      avatarUrl: personContext.person.avatarUrl, review: personContext.book.review, sourceUrl: personContext.book.sourceUrl, isSpoiler: false,
    }} bookTitle={personContext.book.title} onClose={() => setPersonContext(null)} />}
  </>;
}
