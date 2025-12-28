"use client";

import { useRouter } from "next/navigation";
import { Award, Check, Trash2, BookOpen, Calendar, Cpu, Zap, Building2, Beaker, BarChart3, Shield, Wrench, Palette } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

export interface CertificateCardProps {
  item: UserContentWithContent;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
}

// 분야별 테마 설정
const FIELD_THEMES: Record<string, {
  icon: typeof Cpu;
  gradient: string;
  pattern: string;
  accent: string;
}> = {
  정보: {
    icon: Cpu,
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    pattern: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-cyan-400",
  },
  전기: {
    icon: Zap,
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-yellow-400",
  },
  건설: {
    icon: Building2,
    gradient: "from-slate-600 via-zinc-500 to-slate-400",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20.5h18V18H22v-2h18v-2H22v-2h18V8H22V6h18V4H22V2h18V0H20v20.5z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E",
    accent: "text-slate-300",
  },
  화학: {
    icon: Beaker,
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    pattern: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-emerald-400",
  },
  경영: {
    icon: BarChart3,
    gradient: "from-violet-600 via-purple-500 to-fuchsia-500",
    pattern: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Crect x='0' y='0' width='4' height='20'/%3E%3Crect x='8' y='4' width='4' height='16'/%3E%3Crect x='16' y='8' width='4' height='12'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-purple-400",
  },
  보안: {
    icon: Shield,
    gradient: "from-red-600 via-rose-500 to-pink-500",
    pattern: "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E",
    accent: "text-rose-400",
  },
  기계: {
    icon: Wrench,
    gradient: "from-gray-600 via-zinc-500 to-neutral-400",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h20v20H0V0zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm20 0a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 37a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm10-17h20v20H20V20zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-zinc-300",
  },
  문화: {
    icon: Palette,
    gradient: "from-pink-500 via-rose-400 to-orange-400",
    pattern: "data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-pink-400",
  },
  default: {
    icon: Award,
    gradient: "from-indigo-600 via-purple-500 to-pink-500",
    pattern: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M30 30l15-15v30L30 30zm0 0L15 15v30l15-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-purple-400",
  },
};

const statusConfig = {
  WISH: {
    label: "목표",
    ring: "ring-purple-500/50",
    badge: "bg-purple-500/80",
  },
  EXPERIENCE: {
    label: "학습 중",
    ring: "ring-amber-500/50",
    badge: "bg-amber-500/80",
  },
  COMPLETE: {
    label: "취득",
    ring: "ring-green-500/70",
    badge: "bg-green-500/80",
  },
};

function getFieldTheme(title: string, series: string) {
  const text = `${title} ${series}`.toLowerCase();

  if (text.includes('정보') || text.includes('컴퓨터') || text.includes('데이터') || text.includes('sql')) {
    return FIELD_THEMES['정보'];
  }
  if (text.includes('전기') || text.includes('전자')) {
    return FIELD_THEMES['전기'];
  }
  if (text.includes('건축') || text.includes('토목') || text.includes('건설') || text.includes('조경')) {
    return FIELD_THEMES['건설'];
  }
  if (text.includes('화학') || text.includes('위험물')) {
    return FIELD_THEMES['화학'];
  }
  if (text.includes('경영') || text.includes('사무') || text.includes('회계') || text.includes('품질')) {
    return FIELD_THEMES['경영'];
  }
  if (text.includes('보안') || text.includes('정보보호')) {
    return FIELD_THEMES['보안'];
  }
  if (text.includes('기계') || text.includes('용접') || text.includes('설계')) {
    return FIELD_THEMES['기계'];
  }
  if (text.includes('문화') || text.includes('역사') || text.includes('예술')) {
    return FIELD_THEMES['문화'];
  }

  return FIELD_THEMES['default'];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export default function CertificateCard({
  item,
  onStatusChange,
  onDelete,
  href,
}: CertificateCardProps) {
  const router = useRouter();
  const content = item.content;
  const metadata = content.metadata as Record<string, string> | null;
  const addedDate = formatDate(item.created_at);
  const status = item.status || "WISH";
  const statusStyle = statusConfig[status as keyof typeof statusConfig] || statusConfig.WISH;

  const qualificationType = metadata?.qualificationType || "국가자격";
  const series = metadata?.series || content.creator || "";
  const theme = getFieldTheme(content.title, series);
  const FieldIcon = theme.icon;

  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <div
      className="group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      onClick={handleClick}
    >
      <div className={`relative rounded-xl overflow-hidden shadow-xl h-full flex flex-col ring-2 ${statusStyle.ring}`}>
        {/* 상단: 그라데이션 배경 + 패턴 */}
        <div className={`relative h-28 bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
          {/* 배경 패턴 */}
          <div
            className="absolute inset-0 opacity-100"
            style={{ backgroundImage: `url("${theme.pattern}")` }}
          />

          {/* 장식 원형들 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-lg" />

          {/* 중앙 아이콘 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* 아이콘 배경 글로우 */}
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
              {/* 아이콘 컨테이너 */}
              <div className="relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                <FieldIcon size={32} className="text-white drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* 상단 배지들 */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            {/* 자격 유형 */}
            <span className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-sm text-[10px] text-white font-medium">
              {qualificationType}
            </span>

            {/* 상태 배지 */}
            <button
              className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[10px] font-bold text-white ${statusStyle.badge} backdrop-blur-sm transition-transform hover:scale-105 ${
                onStatusChange ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusChange) {
                  const nextStatus = status === "WISH" ? "EXPERIENCE" : status === "EXPERIENCE" ? "COMPLETE" : "WISH";
                  onStatusChange(item.id, nextStatus);
                }
              }}
            >
              {status === "COMPLETE" && <Check size={10} />}
              {statusStyle.label}
            </button>
          </div>

          {/* 취득 완료 골드 스탬프 */}
          {status === "COMPLETE" && (
            <div className="absolute bottom-2 right-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg border-2 border-yellow-300/50">
                <Check size={20} className="text-white" strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* 하단: 정보 영역 */}
        <div className="grow p-3 bg-bg-card flex flex-col">
          {/* 자격증명 */}
          <h3 className="font-bold text-sm text-text-primary mb-1.5 line-clamp-2 min-h-10">
            {content.title}
          </h3>

          {/* 분야 태그 */}
          {series && (
            <div className="flex items-center gap-1.5 mb-auto">
              <BookOpen size={11} className="text-text-secondary" />
              <span className="text-[11px] text-text-secondary truncate">{series}</span>
            </div>
          )}

          {/* 하단 날짜 & 삭제 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Calendar size={10} />
              <span>{addedDate}</span>
            </div>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm("이 자격증을 삭제하시겠습니까?")) {
                    onDelete(item.id);
                  }
                }}
                className="p-1 rounded-md text-text-secondary hover:text-red-400 hover:bg-red-400/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
