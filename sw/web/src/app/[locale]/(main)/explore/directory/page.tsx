/*
  파일명: /app/(main)/explore/directory/page.tsx
  기능: 전체 인물 디렉토리 (SEO용 인덱스 페이지)
  책임: 모든 셀럽을 초성/알파벳순으로 나열하여 크롤러가 한 번에 전체 URL을 발견하도록 한다.
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCelebDirectory, type CelebDirectoryRow } from "@/actions/celebs/getCelebDirectory";
import { getAlternates } from "@/lib/seo";
import { PROFESSION_ICONS, PROFESSION_COLORS } from "@/constants/professionIcons";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";

export async function generateMetadata() {
  const t = await getTranslations("explore.directory");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/directory"),
  };
}

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

export default async function DirectoryPage() {
  const locale = await getLocale();
  const t = await getTranslations("explore.directory");

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
            const color = PROFESSION_COLORS[prof.value] ?? "text-text-tertiary";
            if (!Icon) return null;
            return (
              <span key={prof.value} className="inline-flex items-center gap-1">
                <Icon size={13} className={color} />
                <span className="text-xs text-text-tertiary">
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
                  const ProfIcon = celeb.profession ? PROFESSION_ICONS[celeb.profession] : null;
                  return (
                    <li key={celeb.slug}>
                      <Link
                        href={`/celeb/${celeb.slug}`}
                        className="group flex items-center gap-1.5 py-1 hover:text-accent transition-colors"
                      >
                        {ProfIcon && (
                          <ProfIcon size={13} className={`${PROFESSION_COLORS[celeb.profession!] ?? "text-text-tertiary"} shrink-0`} />
                        )}
                        <span className="text-sm text-text-primary group-hover:text-accent transition-colors">
                          {displayName}
                        </span>
                      </Link>
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
