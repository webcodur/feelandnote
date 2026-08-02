import { Calendar } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, BlurDissolve } from "@/components/ui";
import { getTranslations, getLocale } from "next-intl/server";

interface Figure {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession: string | null;
  title?: string | null;
  bio: string | null;
  bio_en: string | null;
}

interface Content {
  id: string;
  title?: string;
  thumbnail_url?: string | null;
  type?: string;
}

interface FigurePreviewProps {
  figure: Figure;
  contents: Content[];
}

export default async function FigurePreview({ figure, contents }: FigurePreviewProps) {
  if (!figure) return null;

  const locale = await getLocale();
  const t = await getTranslations("todayFigure");
  const tProfession = await getTranslations("profession");

  const displayName = locale === "en" && figure.nickname_en ? figure.nickname_en : figure.nickname;
  const displayBio = locale === "en" && figure.bio_en ? figure.bio_en : figure.bio;
  const professionLabel = figure.profession ? tProfession(figure.profession) : "";

  const today = new Date();
  const dateStr = t("dateLabel", { month: today.getMonth() + 1, day: today.getDate() });

  return (
    <div className="relative group overflow-hidden rounded-3xl bg-neutral-900 border border-white/5 hover:border-accent/40 transition-all duration-700 shadow-2xl">
      {/* 프리미엄 장식 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/80 via-neutral-900/95 to-black z-0 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] mix-blend-overlay z-0 pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* 좌측: 인물 프로필 및 정체성 (세로 중앙 수직 정렬) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center gap-4 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6">
            {/* 날짜 뱃지 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-semibold tracking-wider border border-accent/20 shadow-[0_0_12px_rgba(212,175,55,0.12)]">
              <Calendar size={12} className="opacity-90" />
              <span>{dateStr}</span>
            </div>

            {/* 아바타 영역 */}
            <Link href={`/${figure.id}`} className="relative group/avatar my-1">
              <BlurDissolve className="inline-block">
                <Avatar
                  url={figure.avatar_url}
                  name={displayName}
                  size="4xl"
                  className="ring-4 ring-transparent group-hover/avatar:ring-accent/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] group-hover/avatar:shadow-[0_0_50px_rgba(212,175,55,0.3)] transition-all duration-500 transform group-hover/avatar:scale-105"
                />
              </BlurDissolve>
              <div className="absolute -top-1 -right-1 z-20 min-w-[26px] h-[26px] px-1.5 flex items-center justify-center bg-gradient-to-br from-accent to-[#b89530] text-[#121212] rounded-lg border border-white/20 shadow-xl">
                <span className="text-[12px] font-black leading-none">{contents.length}</span>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black/90 backdrop-blur-md border border-accent/30 rounded-full shadow-lg">
                <span className="text-[9px] font-extrabold text-accent tracking-widest uppercase">TODAY</span>
              </div>
            </Link>

            {/* 이름 + 수식어 + 직업 */}
            <div className="space-y-1.5 flex flex-col items-center">
              <Link href={`/${figure.id}`} className="block">
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-100 group-hover:via-[#d4af37] group-hover:to-accent transition-all duration-700 tracking-tight">
                  {displayName}
                </h3>
              </Link>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {figure.title && (
                  <span className="inline-block font-semibold px-2.5 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent text-xs backdrop-blur-md">
                    {figure.title}
                  </span>
                )}
                {professionLabel && (
                  <span className="inline-block font-medium px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-secondary text-xs backdrop-blur-md">
                    {professionLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 인물 소개 및 대표 작품 갤러리 */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-5 py-1">
            {displayBio && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-accent/80 uppercase">BIOGRAPHY</span>
                </div>
                <div className="relative bg-white/[0.02] p-4 lg:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <p className="text-xs sm:text-sm text-text-secondary/90 leading-relaxed break-keep font-medium italic">
                    "{displayBio}"
                  </p>
                </div>
              </div>
            )}

            {/* 대표 콘텐츠 썸네일 목록 */}
            {contents.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-text-tertiary uppercase">FEATURED WORKS ({contents.length})</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {contents.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/content/${c.id}`}
                      className="group/work relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-950 border border-white/10 hover:border-accent/50 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    >
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title ?? ""} className="w-full h-full object-cover group-hover/work:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-text-tertiary">
                          {c.title}
                        </div>
                      )}
                      {c.title && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 opacity-0 group-hover/work:opacity-100 transition-opacity duration-300">
                          <p className="text-[11px] font-bold text-white truncate">{c.title}</p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
