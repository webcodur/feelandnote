/*
  파일명: /app/(main)/explore/directory/page.tsx
  기능: 전체 인물 디렉토리 (SEO용 인덱스 페이지)
  책임: 모든 셀럽을 초성/알파벳순으로 나열하여 크롤러가 한 번에 전체 URL을 발견하도록 한다.
*/ // ------------------------------

import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCelebDirectory, type CelebDirectoryRow } from "@/actions/celebs/getCelebDirectory";
import { getLocalizedAlternates } from "@/lib/seo";
import { PROFESSION_ICONS, PROFESSION_COLORS } from "@/constants/professionIcons";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";

// 정적(ISR). 명부는 2,400명 전부를 싣는 큰 화면(HTML 수 MB)이라 방문마다 서버가 만들면 그 바이트가 그대로
// 원본 전송량이 된다. 한 번 만들어 CDN에 두고, 인물 등록·삭제·공개 상태 변경 때 DB 트리거가 'celebs' 태그를 비운다.
export const revalidate = 604800;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("explore.directory");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/directory"),
  };
}

/** 목록 항목 한 줄. 항목이 2,400개라 클래스 문자열도 한 번만 적는다 */
const ITEM_CLASS = "group flex items-center gap-1.5 py-1 text-sm text-text-primary hover:text-accent";

/** 한글 초성 추출 */
function getChosung(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const CHOSUNG = [
      "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
      "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    ];
    return CHOSUNG[Math.floor((code - 0xac00) / 588)]!;
  }
  if (/[a-zA-Z]/.test(char)) return char.toUpperCase();
  return "#";
}

export default async function DirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("explore.directory");
  // 2,400개 항목마다 클라이언트 Link를 세우면 항목당 데이터가 RSC 페이로드에 한 번 더 실리고 미리가져오기까지 돈다.
  // 명부는 색인용 목록이라 순수 링크(<a>)로 그린다
  const localePrefix = locale === "en" ? "/en" : "";

  const celebs = await getCelebDirectory();

  // 초성/알파벳별 그룹핑
  const groups = new Map<string, CelebDirectoryRow[]>();
  for (const celeb of celebs) {
    const name = locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
    const key = getChosung(name.charAt(0));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(celeb);
  }

  // 정렬: ㄱ~ㅎ → A~Z → #
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const isKoA = /[ㄱ-ㅎ]/.test(a);
    const isKoB = /[ㄱ-ㅎ]/.test(b);
    if (isKoA && !isKoB) return -1;
    if (!isKoA && isKoB) return 1;
    return a.localeCompare(b, "ko");
  });

  const totalCount = celebs.length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 직군 범례 */}
      <div className="mb-8 space-y-3">
        <p className="text-text-secondary text-sm">
          {t("totalCount", { count: totalCount })}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CELEB_PROFESSIONS.map((prof) => {
            const Icon = PROFESSION_ICONS[prof.value];
            const color = PROFESSION_COLORS[prof.value] ?? "";
            if (!Icon) return null;
            return (
              <span key={prof.value} className="inline-flex items-center gap-1">
                <Icon size={13} className={color} />
                <span className="text-xs">
                  {locale === "en" ? prof.label_en : prof.label}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 앵커 네비게이션 */}
      <nav className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-bg-main/95 backdrop-blur-sm py-3 z-10 border-b border-white/5">
        {sortedKeys.map((key) => (
          <a
            key={key}
            href={`#group-${key}`}
            className="px-2.5 py-1 text-sm font-medium text-text-secondary hover:text-accent transition-colors rounded-md hover:bg-white/5"
          >
            {key}
          </a>
        ))}
      </nav>

      {/* 직군 아이콘 원본 — 항목 2,400개가 각자 SVG를 품으면 그것만 수 MB다. 한 번만 그리고 <use>로 참조한다 */}
      <svg aria-hidden className="hidden">
        {CELEB_PROFESSIONS.map((prof) => {
          const Icon = PROFESSION_ICONS[prof.value];
          if (!Icon) return null;
          return (
            <symbol key={prof.value} id={`prof-${prof.value}`} viewBox="0 0 24 24">
              <Icon size={24} />
            </symbol>
          );
        })}
      </svg>

      {/* 인물 목록 */}
      <div className="space-y-10">
        {sortedKeys.map((key) => {
          const items = groups.get(key)!;
          return (
            <section key={key} id={`group-${key}`}>
              <h2 className="text-2xl font-serif font-bold text-accent/80 mb-4 border-b border-white/5 pb-2">
                {key}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                {items.map((celeb) => {
                  const displayName =
                    locale === "en" && celeb.nickname_en
                      ? celeb.nickname_en
                      : celeb.nickname;
                  const hasIcon = !!(celeb.profession && PROFESSION_ICONS[celeb.profession]);
                  return (
                    <li key={celeb.slug}>
                      <a href={`${localePrefix}/celeb/${celeb.slug}`} className={ITEM_CLASS}>
                        {hasIcon && (
                          <svg width={13} height={13} className={`${PROFESSION_COLORS[celeb.profession!] ?? ""} shrink-0`}>
                            <use href={`#prof-${celeb.profession}`} />
                          </svg>
                        )}
                        <span>{displayName}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
