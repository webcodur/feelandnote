/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 레이아웃(월드 스코프·최근 본 인물)
 * - 목차 위치: 공통 (페이지 외곽)
 * - 데이터: getCelebBySlug 서버액션, resolveCelebWorld
 * - 함께 보기: page.tsx, CelebPageContent.tsx
 * ───────────────────────────────────────────── */
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import RecentProfileTracker from "@/components/features/profile/RecentProfileTracker";
import CelebWorldMaterialScope from "@/components/features/celeb/CelebWorldMaterialScope";
import { getWorldMaterial, getWorldMaterialStyle } from "@/lib/celeb/worldMaterial";
import { resolveCelebWorld } from "@/lib/celeb/world";
import PageContainer from "@/components/layout/PageContainer";
import MessageScope from "@/components/shared/MessageScope";
import { CELEB_MESSAGE_PATHS } from "@/i18n/message-scope";
import styles from "./CelebDetailTypography.module.css";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}

// 눈아픔 신고로 세계 재질 테마를 뺀 인물. 늘려야 하면 이 목록에 slug만 추가한다.
const NO_WORLD_THEME_SLUGS = new Set(["william-shakespeare"]);

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

  // 푸터·헤더는 월드 스코프 밖에 있어 스코프 변수(accent 등)를 못 받는다.
  // 셀럽 테마를 :root로 승격시켜 페이지 전체(푸터 포함)가 그때그때 맞게 따른다.
  const disableTheme = NO_WORLD_THEME_SLUGS.has(slug);
  const material = getWorldMaterial(worldId);
  const rootThemeCss = `:root{${Object.entries(getWorldMaterialStyle(material))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;

  // 이 화면이 실제로 쓰는 문구만 받는다. 사전 전체를 실으면 한 장이 굳을 때마다
  // HTML·RSC 양쪽에 187KB가 복사된다(external-services.md「ISR 쓰기 비용 규칙」).
  return (
    <MessageScope paths={CELEB_MESSAGE_PATHS}>
      {!disableTheme && <style dangerouslySetInnerHTML={{ __html: rootThemeCss }} />}
      <CelebWorldMaterialScope worldId={worldId} disableTheme={disableTheme}>
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
    </MessageScope>
  );
}
