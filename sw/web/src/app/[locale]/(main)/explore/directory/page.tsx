/*
  파일명: /app/(main)/explore/directory/page.tsx
  기능: 전체 인물 디렉토리 (SEO용 인덱스 페이지)
  책임: 모든 셀럽을 초성/알파벳순으로 나열하여 크롤러가 한 번에 전체 URL을 발견하도록 한다.
*/ // ------------------------------

import { getCelebProfileUrl } from "@/lib/url";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCelebDirectory } from "@/actions/celebs/getCelebDirectory";
import { getLocalizedAlternates } from "@/lib/seo";
import { getProfessionIcon, getProfessionColor } from "@/constants/professionIcons";
import { getCelebProfessions } from '@/lib/celeb-professions'
import styles from "./directory.module.css";
import VisitorDirectory from "@/components/features/user/explore/VisitorDirectory";
import DirectoryNavigator from "@/components/features/user/explore/DirectoryNavigator";
import { directoryName, groupDirectory } from "@/lib/directory";

// 정적(ISR). 명부는 2,400명 전부를 싣는 큰 화면(HTML 수 MB)이라 방문마다 서버가 만들면 그 바이트가 그대로
// 원본 전송량이 된다. 한 번 만들어 CDN에 두고, 인물 등록·삭제·공개 상태 변경 때 DB 트리거가 'celebs' 태그를 비운다.
export const revalidate = 604800;

// [locale] 세그먼트는 generateStaticParams가 없으면 동적으로 취급된다(빌드 표의 ƒ). 빈 배열을 돌려주면
// 첫 요청에 ISR로 만들어져 다음부터 CDN에서 나간다(인물 상세와 같은 방식).
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 인원은 화면의 「총 N명」과 같은 캐시에서 센다 — 문구에 박아 둔 「1,000명 이상」은 실제의 몇 분의 일이었다
  const [t, celebs] = await Promise.all([getTranslations({ locale, namespace: "explore.directory" }), getCelebDirectory()]);
  return {
    title: t("metaTitle"),
    description: t("metaDescription", { count: celebs.length }),
    alternates: await getLocalizedAlternates("/explore/directory"),
  };
}

export default async function DirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, CELEB_PROFESSIONS, celebs] = await Promise.all([
    getTranslations({ locale, namespace: "explore.directory" }), getCelebProfessions(), getCelebDirectory(),
  ]);
  // 2,400개 항목마다 클라이언트 Link를 세우면 항목당 데이터가 RSC 페이로드에 한 번 더 실리고 미리가져오기까지 돈다.
  // 명부는 색인용 목록이라 순수 링크(<a>)로 그린다
  const localePrefix = locale === "en" ? "/en" : "";

  const groups = groupDirectory(celebs, locale);
  const totalCount = celebs.length;
  const counts = new Map<string, number>();
  for (const celeb of celebs) if (celeb.profession) counts.set(celeb.profession, (counts.get(celeb.profession) ?? 0) + 1);
  const professionOptions = [
    { value: "all", label: t("allProfessions"), href: `${localePrefix}/explore/directory`, count: totalCount },
    ...CELEB_PROFESSIONS.map((prof) => ({ value: prof.value, label: locale === "en" ? prof.label_en : prof.label,
      href: `${localePrefix}/explore/directory/${prof.value}`, count: counts.get(prof.value) ?? 0 })),
  ];

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-y-3">
      <div className="space-y-2">
        <p className="text-center text-text-secondary text-sm">
          {t("totalCount", { count: totalCount })}
        </p>
        <DirectoryNavigator kind="profession" options={professionOptions} currentValue="all" />
      </div>
      <div className="sticky top-[var(--layer-header-h)] z-10 self-start bg-bg-main/95 py-2 backdrop-blur-sm">
        <DirectoryNavigator kind="initial" options={groups.map(([key, items]) => ({ value: key, label: key, href: `#group-${key}`, count: items.length }))} />
      </div>
      <VisitorDirectory />

      {/* 직군 아이콘 원본 — 항목 2,400개가 각자 SVG를 품으면 그것만 수 MB다. 한 번만 그리고 <use>로 참조한다 */}
      <svg aria-hidden className="hidden">
        {CELEB_PROFESSIONS.map((prof) => {
          const Icon = getProfessionIcon(prof.value);
          if (!Icon) return null;
          return (
            <symbol key={prof.value} id={`prof-${prof.value}`} viewBox="0 0 24 24">
              <Icon size={24} />
            </symbol>
          );
        })}
      </svg>

      {/* 인물 목록 */}
      <div className="col-span-full space-y-10 pt-2 md:pt-4">
        {groups.map(([key, items]) => {
          return (
            <section key={key} id={`group-${key}`} className="scroll-mt-40">
              <h2 className="text-2xl font-serif font-bold text-accent/80 mb-4 border-b border-white/5 pb-2">
                {key}
              </h2>
              <ul className={`${styles.list} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5`}>
                {items.map((celeb) => {
                  const displayName = directoryName(celeb, locale);
                  const hasIcon = !!(celeb.profession && getProfessionIcon(celeb.profession));
                  return (
                    <li key={celeb.slug}>
                      <a href={`${localePrefix}${getCelebProfileUrl(celeb)}`}>
                        {hasIcon && (
                          <svg className={getProfessionColor(celeb.profession!)} aria-hidden="true">
                            <use href={`#prof-${celeb.profession}`} />
                          </svg>
                        )}
                        {displayName}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <nav aria-label={t("professionIndexTitle")} className="col-span-full mt-10 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-center text-sm font-semibold text-text-secondary">{t("professionIndexTitle")}</h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {professionOptions.slice(1).map((option) => <li key={option.value}>
            <a href={option.href} className="inline-flex min-h-11 items-center rounded-control px-3 text-sm text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{option.label}</a>
          </li>)}
        </ul>
      </nav>
    </div>
  );
}
