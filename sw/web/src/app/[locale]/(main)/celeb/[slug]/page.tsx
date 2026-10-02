import { Suspense } from 'react';
import { connection } from 'next/server';
import { setRequestLocale } from 'next-intl/server';
import { getCelebRouteIdentity } from '@/lib/profile-route';
import { shouldStreamForRequest } from '@/lib/render-mode';
import CelebPageBody from './CelebPageBody';
import CelebPagePreview from './CelebPagePreview';
import { buildCelebPageMetadata } from './celebPageMetadata';

type PageProps = { params: Promise<{ locale: string; slug: string }> };


export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return buildCelebPageMetadata(locale, slug);
}

export default async function CelebPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  // ISR 첫 요청의 완성 렌더 대기를 없애고 데이터 캐시는 유지한다.
  await connection();
  // 200을 보내기 전에 공개 여부를 확인한다. 레이아웃과 같은 조회를 공유한다.
  const identity = await getCelebRouteIdentity(slug, locale);
  // 봇에는 본문까지 완성해서 보낸다. htmlLimitedBots는 메타데이터 대기만 제어한다.
  if (!(await shouldStreamForRequest())) return <CelebPageBody params={params} />;
  return (
    <Suspense fallback={<CelebPagePreview identity={identity} locale={locale} />}>
      <CelebPageBody params={params} />
    </Suspense>
  );
}
