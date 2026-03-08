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
  const professionLabel = figure.profession ? tProfession(figure.profession as any) : "";

  const today = new Date();
  const dateStr = t("dateLabel", { month: today.getMonth() + 1, day: today.getDate() });

  return (
    <div className="relative group overflow-hidden rounded-3xl bg-neutral-900 border border-white/5 hover:border-accent/40 transition-all duration-700 shadow-2xl">
      {/* 프리미엄 장식 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/80 via-neutral-900/95 to-black z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] rounded-full group-hover:bg-accent/10 transition-all duration-700 z-0 pointer-events-none" />

      {/* 노이즈 텍스처 (옵션 - CSS 설정이 있다면) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] mix-blend-overlay z-0 pointer-events-none" />

      <div className="relative z-10 p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-14">
        {/* 아바타 영역 */}
        <Link href={`/${figure.id}`} className="shrink-0 relative group/avatar">
          <Avatar
            url={figure.avatar_url}
            name={displayName}
            size="2xl"
            className="ring-4 ring-transparent group-hover/avatar:ring-accent/30 shadow-[0_4px_40px_rgba(0,0,0,0.4)] group-hover/avatar:shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all duration-500 transform group-hover/avatar:scale-[1.02]"
          />
          <div className="absolute -top-2 -right-2 z-20 min-w-[32px] h-[32px] px-2 flex items-center justify-center bg-gradient-to-br from-accent to-[#b89530] text-[#121212] flex-col rounded-xl border border-white/20 shadow-xl overflow-hidden">
             <span className="text-[14px] font-black leading-none">{contents.length}</span>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 backdrop-blur-sm border border-white/10 rounded-full shadow-lg">
            <span className="text-[10px] font-bold text-accent tracking-widest uppercase">Today</span>
          </div>
        </Link>
        
        {/* 텍스트 정보 영역 */}
        <div className="flex-1 text-center md:text-left space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent/90 text-[11px] font-semibold tracking-wider mb-4 border border-accent/20">
              <Calendar size={12} className="opacity-80" />
              <span>{dateStr}</span>
            </div>
            <Link href={`/${figure.id}`} className="block">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-100 group-hover:via-[#d4af37] group-hover:to-accent transition-all duration-700 tracking-tight mb-3">
                {displayName}
              </h3>
            </Link>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-text-secondary text-sm backdrop-blur-md">
                {professionLabel}
              </span>
            </div>
          </div>
          
          {displayBio && (
            <p className="text-sm md:text-base text-text-tertiary leading-relaxed max-w-2xl break-keep">
              {displayBio}
            </p>
          )}

          <div className="pt-4 flex justify-center md:justify-start">
             <Link
                href={`/${figure.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-semibold text-text-secondary hover:text-white transition-all duration-300 group/btn"
            >
                서명 남기기 <ArrowRight size={16} className="text-text-tertiary group-hover/btn:text-accent group-hover/btn:translate-x-1 transition-all duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
