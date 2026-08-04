import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import CelebWorldMaterialScope from "@/components/features/celeb/CelebWorldMaterialScope";
import { resolveCelebWorld } from "@/lib/celeb/world";
import PageContainer from "@/components/layout/PageContainer";
import styles from "./CelebDetailTypography.module.css";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CelebLayout({ children, params }: LayoutProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getCelebBySlug(slug, locale);

  if (!result.success || !result.data) {
    notFound();
  }

  const profile = result.data;
  const worldId = resolveCelebWorld({
    nationality: profile.nationality,
    birthDate: profile.birth_date,
    deathDate: profile.death_date,
    tier: profile.celeb_tier,
  });

  return (
    <CelebWorldMaterialScope worldId={worldId}>
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
        <main className={`${styles.detailTypography} mx-auto max-w-[1400px] animate-fade-in`}>
          {children}
        </main>
      </PageContainer>
    </CelebWorldMaterialScope>
  );
}
