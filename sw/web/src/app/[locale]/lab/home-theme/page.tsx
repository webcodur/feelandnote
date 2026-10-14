import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import MainLayout from '@/components/layout/LayoutMain';
import { QuickRecordProvider } from '@/contexts/QuickRecordContext';
import HomeThemeLab from '@/components/lab/home-theme/HomeThemeLab';
import { getHomeThemeData } from '@/components/lab/home-theme/data';
import { getLocalizedAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === 'en' ? 'Home theme | Lab' : '홈 테마 | Lab', alternates: await getLocalizedAlternates('/lab/home-theme'), robots: { index: false, follow: false } };
}

export default async function Page() {
  const locale = await getLocale() as 'ko' | 'en';
  const data = await getHomeThemeData(locale);
  // 주소는 랩실에 두되, 홈 시안의 현재 메뉴 표시는 실제 홈과 같게 검수한다.
  return <QuickRecordProvider><MainLayout navigationHref="/"><HomeThemeLab data={data} locale={locale} /></MainLayout></QuickRecordProvider>;
}
