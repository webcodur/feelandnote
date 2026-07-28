import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import SectionHeader from "@/components/shared/SectionHeader";
import PrismBanner from "@/components/lab/PrismBanner";
import PageContainer from "@/components/layout/PageContainer";
import styles from "./CelebDetailTypography.module.css";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

function buildSeoDescKo(
  nickname: string,
  professionLabel: string,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK}권의 책`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO}편의 영화`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC}곡의 음악`);
  if (counts.GAME > 0) parts.push(`${counts.GAME}개의 게임`);
  const particle = subjectParticle(nickname);
  return parts.length > 0
    ? `${professionLabel} ${nickname}${particle} 감상한\n${parts.join(", ")}`
    : `${professionLabel} ${nickname}의 감상 기록`;
}

function buildSeoDescEn(
  nickname: string,
  professionLabel: string,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): string {
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} games`);
  return parts.length > 0
    ? `${parts.join(", ")}\nenjoyed by ${professionLabel} ${nickname}`
    : `${professionLabel} ${nickname}'s reading records`;
}

export default async function CelebLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("celebPage");
  const tp = await getTranslations("profession");

  const result = await getCelebBySlug(slug, locale);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  const pageTitle = `${profile.nickname}${t("archiveSuffix")}`;
  const englishTitle = t("archiveEnglish");

  const professionLabel = profile.profession ? tp(profile.profession) : '';
  const counts = profile.contentTypeCounts;
  const seoDesc = locale === 'en'
    ? buildSeoDescEn(profile.nickname, professionLabel, counts)
    : buildSeoDescKo(profile.nickname, professionLabel, counts);

  return (
    <>
      <PrismBanner height={350} compact>
        <p aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {pageTitle}
        </p>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-base sm:text-lg mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </PrismBanner>
      <RecentProfileTracker
        profile={{
          id: profile.id,
          nickname: profile.nickname,
          nickname_en: profile.nickname_en,
          nickname_ko: profile.nickname_ko,
          avatarUrl: profile.avatar_url ?? null,
          title: profile.title ?? null,
          title_en: profile.title_en,
          title_ko: profile.title_ko,
          profileType: "CELEB",
        }}
      />
      <PageContainer wide>
        <main className={`${styles.detailTypography} max-w-[1400px] mx-auto animate-fade-in`}>
          <SectionHeader
            title={seoDesc}
            label="LEGACY"
            description={t("guestbookCta")}
            descriptionClassName="text-base sm:text-lg"
            as="h1"
          />
          {children}
        </main>
      </PageContainer>
    </>
  );
}
