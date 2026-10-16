"use client";

import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentMetadata as Metadata } from "@/types/content";
import { getCountryNameByLocale } from "@/lib/countries";
import styles from "./ContentDetail.module.css";

export default function ContentMetadata({ content }: { content: ContentDetailData["content"] }) {
  const t = useTranslations("contentDetail");
  const tCore = useTranslations("shared.content");
  const locale = useLocale();
  const metadata = content.metadata as unknown as Metadata | null;
  const isTv = content.type === 'VIDEO' && (metadata?.subtype === 'tv' || /^tmdb-tv-/.test(content.externalId || content.id));
  const creatorRole = isTv ? 'creator' : { BOOK: 'author', VIDEO: 'director', GAME: 'developer', MUSIC: 'artist' }[content.type];
  const dateLabel = content.type === 'BOOK' ? 'publishDate' : isTv ? 'firstAirDate' : content.type === 'VIDEO' ? 'videoReleaseDate' : content.type === 'MUSIC' ? 'musicReleaseDate' : 'releaseDate';
  const facts: { label: string; value: string; rating?: boolean }[] = [];
  if (content.releaseDate) facts.push({ label: t(dateLabel), value: content.releaseDate });
  if (content.type === 'VIDEO') {
    if (metadata?.runtime && metadata.runtime > 0) facts.push({ label: t(isTv ? 'episodeRuntime' : 'runtime'), value: t('runtimeMinutes', { minutes: metadata.runtime }) });
    const countries = (metadata?.productionCountries ?? []).filter(code => /^[A-Z]{2}$/.test(code)).map(code => getCountryNameByLocale(code, locale));
    if (countries.length) facts.push({ label: t('productionCountry'), value: countries.join(' · ') });
    if (metadata?.voteAverage && metadata.voteAverage > 0) facts.push({ label: t('tmdbRating'), value: metadata.voteAverage.toFixed(1) + ' / 10', rating: true });
  }
  if (content.type === 'BOOK') {
    if (metadata?.publisher) facts.push({ label: t('publisher'), value: metadata.publisher });
    if (metadata?.isbn) facts.push({ label: 'ISBN', value: metadata.isbn });
  }
  if (content.type === 'GAME') {
    if (metadata?.platforms?.length) facts.push({ label: t('platform'), value: metadata.platforms.join(' · ') });
    if (metadata?.rating && metadata.rating > 0) facts.push({ label: 'IGDB', value: metadata.rating.toFixed(1), rating: true });
  }
  if (content.type === 'MUSIC') {
    if (metadata?.albumType) facts.push({ label: t('albumFormat'), value: metadata.albumType });
    if (metadata?.totalTracks) facts.push({ label: t('trackList'), value: tCore('tracks', { count: metadata.totalTracks }) });
    if (metadata?.label) facts.push({ label: t('recordLabel'), value: metadata.label });
  }
  return <div className={styles.metadata}>
    {content.creator && <div className={styles.creatorLine}><span className={styles.factLabel}>{t(creatorRole)}</span><span className={styles.creatorName}><CreatorNames text={content.creator} /></span></div>}
    {!!metadata?.genres?.length && <div className={styles.genreList}>{metadata.genres.map(genre => <span key={genre}>{genre}</span>)}</div>}
    {!!facts.length && <dl className={styles.facts}>{facts.map(fact => <div key={fact.label} className={styles.fact}>
      <dt className={styles.factLabel}>{fact.label}</dt><dd className={fact.rating ? styles.ratingValue : styles.factValue}>{fact.rating && <Star size={14} aria-hidden="true" />}{fact.value}</dd>
    </div>)}</dl>}
  </div>;
}
