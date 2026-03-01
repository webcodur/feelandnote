import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { notFound } from "next/navigation";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import SectionHeader from "@/components/shared/SectionHeader";
import PrismBanner from "@/components/lab/PrismBanner";
import PageContainer from "@/components/layout/PageContainer";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { PAGE_BANNER } from "@/constants/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

export default async function CelebLayout({ children, params }: LayoutProps) {
  const { slug } = await params;

  const result = await getCelebBySlug(slug);
  if (!result.success || !result.data) {
    notFound();
  }
  const profile = result.data;

  const { titleSuffix, englishTitle } = PAGE_BANNER.archive;
  const pageTitle = `${profile.nickname}${titleSuffix}`;

  // SEO 문구: "배우 제시 아이젠버그가 감상한 8권의 책, 1편의 영화, 3곡의 음악"
  const professionLabel = getCelebProfessionLabel(profile.profession);
  const counts = profile.contentTypeCounts;
  const parts: string[] = [];
  if (counts.BOOK > 0) parts.push(`${counts.BOOK}권의 책`);
  if (counts.VIDEO > 0) parts.push(`${counts.VIDEO}편의 영화`);
  if (counts.MUSIC > 0) parts.push(`${counts.MUSIC}곡의 음악`);
  if (counts.GAME > 0) parts.push(`${counts.GAME}개의 게임`);
  const particle = subjectParticle(profile.nickname);
  const seoDesc = parts.length > 0
    ? `${professionLabel} ${profile.nickname}${particle} 감상한 ${parts.join(", ")}`
    : `${professionLabel} ${profile.nickname}의 감상 기록`;

  return (
    <>
      <PrismBanner height={350} compact>
        <p aria-hidden="true" className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center">
          {pageTitle}
        </p>
        <p className="text-[#d4af37] tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
          {englishTitle}
        </p>
      </PrismBanner>
      <RecentProfileTracker
        profile={{
          id: profile.id,
          nickname: profile.nickname,
          avatarUrl: profile.avatar_url ?? null,
          title: profile.title ?? null,
          profileType: "CELEB",
        }}
      />
      <PageContainer>
        <main className="max-w-4xl mx-auto animate-fade-in">
          <SectionHeader
            title={seoDesc}
            label="LEGACY"
            description="방명록에 당신의 생각을 남겨보세요."
            as="h1"
          />
          {children}
        </main>
      </PageContainer>
    </>
  );
}
