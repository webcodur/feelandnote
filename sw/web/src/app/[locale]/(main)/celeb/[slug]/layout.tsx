import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import { CelebThemeHero, CelebThemeScope } from "@/components/features/celeb/CelebTheme";
import SectionHeader from "@/components/shared/SectionHeader";
import PageContainer from "@/components/layout/PageContainer";
import { resolveCelebTheme } from "@/lib/celeb/theme";
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

/** 화면 맨 위 큰 글씨. 윗줄은 인물을 세우는 제목, 아랫줄은 소장 내역이다. */
interface Headline {
  lead: string;
  detail?: string;
}

function buildHeadlineKo(
  nickname: string,
  professionLabel: string,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): Headline {
  const subject = professionLabel ? `${professionLabel} ${nickname}` : nickname;
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK}권의 책`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO}편의 영화`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC}곡의 음악`);
  if (counts.GAME > 0) parts.push(`${counts.GAME}개의 게임`);
  const particle = subjectParticle(nickname);
  return parts.length > 0
    ? { lead: `${subject}${particle} 감상한`, detail: parts.join(", ") }
    : { lead: `${subject}의 감상 기록` };
}

function buildHeadlineEn(
  nickname: string,
  professionLabel: string,
  counts: { BOOK: number; VIDEO: number; GAME: number; MUSIC: number },
): Headline {
  const subject = professionLabel ? `${professionLabel} ${nickname}` : nickname;
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK} books`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO} movies`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC} songs`);
  if (counts.GAME > 0) parts.push(`${counts.GAME} games`);
  return parts.length > 0
    ? { lead: `Enjoyed by ${subject}`, detail: parts.join(", ") }
    : { lead: `${subject}'s reading records` };
}

function buildFictionHeadlineKo(
  nickname: string,
  professionLabel: string,
): Headline {
  const subject = professionLabel ? `${professionLabel} ${nickname}` : nickname;
  return { lead: `${subject}의 원전·등장 작품` };
}

function buildFictionHeadlineEn(
  nickname: string,
  professionLabel: string,
): Headline {
  const subject = professionLabel ? `${professionLabel} ${nickname}` : nickname;
  return { lead: `Source works featuring ${subject}` };
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
  const theme = resolveCelebTheme({
    slug,
    profession: profile.profession,
    birthDate: profile.birth_date,
    tier: profile.celeb_tier,
  });

  const pageTitle = `${profile.nickname}${t("archiveSuffix")}`;
  const englishTitle = t("archiveEnglish");

  const professionLabel = profile.profession
    ? tp.has(profile.profession)
      ? tp(profile.profession)
      : tp("uncategorized")
    : "";
  const headlineProfessionLabel =
    profile.profession === "other" || profile.profession === "uncategorized"
      ? ""
      : professionLabel;
  const counts = profile.contentTypeCounts;
  const isFiction = profile.celeb_tier === "fiction";
  const headline = isFiction
    ? locale === "en"
      ? buildFictionHeadlineEn(profile.nickname, headlineProfessionLabel)
      : buildFictionHeadlineKo(profile.nickname, headlineProfessionLabel)
    : locale === "en"
      ? buildHeadlineEn(profile.nickname, headlineProfessionLabel, counts)
      : buildHeadlineKo(profile.nickname, headlineProfessionLabel, counts);

  return (
    <CelebThemeScope theme={theme}>
      <CelebThemeHero title={pageTitle} subtitle={englishTitle} theme={theme} />
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
            title={
              <>
                <span className="block">{headline.lead}</span>
                {headline.detail && (
                  <span className="mt-2.5 block font-sans text-base font-semibold tracking-[0.02em] text-accent/85 sm:mt-3 sm:text-lg">
                    {headline.detail}
                  </span>
                )}
              </>
            }
            label="LEGACY"
            description={t(
              isFiction ? "fictionGuestbookCta" : "guestbookCta",
            )}
            descriptionClassName="text-base sm:text-lg"
            as="h1"
          />
          {children}
        </main>
      </PageContainer>
    </CelebThemeScope>
  );
}
