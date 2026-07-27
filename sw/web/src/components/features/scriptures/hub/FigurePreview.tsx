import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";

interface Figure {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession: string | null;
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

export default function FigurePreview({ figure, contents }: FigurePreviewProps) {
  const t = useTranslations("todayFigure");
  const tProfession = useTranslations("profession");
  const locale = useLocale();

  if (!figure) return null;

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

      <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center text-center gap-5">
        {/* 날짜 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent/90 text-[11px] font-semibold tracking-wider border border-accent/20">
          <Calendar size={12} className="opacity-80" />
          <span>{dateStr}</span>
        </div>

        {/* 아바타 영역 */}
        <Link href={`/${figure.id}`} className="relative group/avatar">
          <Avatar
            url={figure.avatar_url}
            name={displayName}
            size="4xl"
            className="ring-4 ring-transparent group-hover/avatar:ring-accent/30 shadow-[0_4px_40px_rgba(0,0,0,0.4)] group-hover/avatar:shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all duration-500 transform group-hover/avatar:scale-[1.02]"
          />
          <div className="absolute -top-1 -right-1 z-20 min-w-[28px] h-[28px] px-1.5 flex items-center justify-center bg-gradient-to-br from-accent to-[#b89530] text-[#121212] rounded-lg border border-white/20 shadow-xl">
            <span className="text-[13px] font-black leading-none">{contents.length}</span>
          </div>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black/90 backdrop-blur-sm border border-white/10 rounded-full shadow-lg">
            <span className="text-[10px] font-bold text-accent tracking-widest uppercase">Today</span>
          </div>
        </Link>

        {/* 이름 + 직업 */}
        <div className="space-y-2">
          <Link href={`/${figure.id}`} className="block">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-100 group-hover:via-[#d4af37] group-hover:to-accent transition-all duration-700 tracking-tight">
              {displayName}
            </h3>
          </Link>
          <span className="inline-block font-medium px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-secondary text-sm backdrop-blur-md">
            {professionLabel}
          </span>
        </div>

        {/* 소개 */}
        {displayBio && (
          <p className="text-sm text-text-tertiary leading-relaxed max-w-lg break-keep">
            {displayBio}
          </p>
        )}

        {/* 대표 콘텐츠 썸네일 */}
        {contents.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {contents.filter(c => c.thumbnail_url).slice(0, 3).map((c) => (
              <div key={c.id} className="w-12 h-16 md:w-14 md:h-[76px] rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md flex-shrink-0">
                <img src={c.thumbnail_url!} alt={c.title ?? ""} className="w-full h-full object-cover" />
              </div>
            ))}
            {contents.length > 3 && (
              <span className="text-xs text-text-tertiary font-medium ml-1">+{contents.length - 3}</span>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/${figure.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-semibold text-text-secondary hover:text-white transition-all duration-300 group/btn mt-1"
        >
          {t("leaveSignature")} <ArrowRight size={16} className="text-text-tertiary group-hover/btn:text-accent group-hover/btn:translate-x-1 transition-all duration-300" />
        </Link>
      </div>
    </div>
  );
}
