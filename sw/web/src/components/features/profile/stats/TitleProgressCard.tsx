/*
  파일명: /components/features/stats/TitleProgressCard.tsx
  기능: 칭호 현황 카드 렌더링
  책임: 획득/미획득 칭호 목록과 진행도 표시
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";
import { Lock, CheckCircle2 } from "lucide-react";

import { TITLE_GRADE_CONFIG, type TitleGrade } from "@/constants/titles";

// RARITY_COLORS 제거 (TITLE_GRADE_CONFIG로 대체)

interface TitleItem {
  id: string;
  name: string;
  desc: string;
  rarity: string;
  earned: boolean;
  date?: string;
  bonus: number;
  progress?: number;
}

interface TitleProgressCardProps {
  titles: TitleItem[];
}

export default function TitleProgressCard({ titles }: TitleProgressCardProps) {
  const earnedTitles = titles.filter((t) => t.earned);
  const totalBonus = earnedTitles.reduce((sum, t) => sum + t.bonus, 0);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">칭호 현황</h3>
        <div className="text-sm">
          <span className="text-accent font-semibold">{earnedTitles.length}</span>
          <span className="text-text-secondary">/{titles.length} 획득</span>
          <span className="text-xs text-text-secondary ml-2">(+{totalBonus}점)</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {titles.map((title) => {
          const gradeKey = title.rarity === '일반' ? 'common' : 
                          title.rarity === '고급' ? 'uncommon' :
                          title.rarity === '희귀' ? 'rare' :
                          title.rarity === '영웅' ? 'epic' :
                          title.rarity === '전설' ? 'legendary' : 'common';
          const gradeConfig = TITLE_GRADE_CONFIG[gradeKey as TitleGrade];

          return (
            <div
              key={title.id}
              className={`p-3 rounded-xl border transition-all ${
                title.earned
                  ? `bg-gradient-to-br ${gradeConfig.marble} ${gradeConfig.borderColor} shadow-sm`
                  : "bg-black/20 border-white/5 opacity-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${title.earned ? gradeConfig.bgColor : 'bg-white/5'}`}
                >
                  {title.earned ? (
                    <CheckCircle2 size={20} className={gradeConfig.color} />
                  ) : (
                    <Lock size={18} className="text-text-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-sm truncate ${title.earned ? gradeConfig.color : 'text-text-secondary'}`}>
                      {title.earned ? title.name : "???"}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${gradeConfig.bgColor} ${gradeConfig.color}`}
                    >
                      {gradeConfig.label}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {title.earned ? title.desc : "조건을 달성하면 해금됩니다"}
                  </div>
                  {title.earned ? (
                    <div className="text-[11px] text-text-secondary mt-1">
                      {title.date} 획득 · +{title.bonus}점
                    </div>
                  ) : (
                    title.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-text-secondary">진행률</span>
                          <span className="text-accent">{title.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{
                              width: `${title.progress}%`
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
