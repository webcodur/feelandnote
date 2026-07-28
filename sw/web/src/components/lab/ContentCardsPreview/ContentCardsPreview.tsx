/*
  파일명: ContentCardsPreview.tsx
  기능: 컨텐츠 카드 컴포넌트 가이드
  책임: 페이지별 컨텐츠 카드 사용처 안내
*/

"use client";

import { useState } from "react";
import { Book, Film, Star, FileCode } from "lucide-react";
import { PAGE_CARD_MAP, CARD_COMPONENTS } from "./types";
import UnifiedView from "./sections/UnifiedView";

// #region 샘플 카드 컴포넌트
function SamplePosterCard() {
  return (
    <div className="w-28 bg-[#212121] border border-border/60 rounded-lg overflow-hidden">
      <div className="aspect-[2/3] overflow-hidden relative bg-bg-secondary">
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <Book size={28} className="" />
        </div>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-bg-main/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-text-secondary">
          <Star size={10} className="text-yellow-500 fill-yellow-500" />
          4.5
        </div>
      </div>
      <div className="p-2">
        <h3 className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
          콘텐츠 제목
        </h3>
        <p className="text-[10px] text-text-secondary line-clamp-1 mt-0.5">
          작가명
        </p>
      </div>
    </div>
  );
}

function SampleHorizontalCard() {
  return (
    <div className="flex gap-3 p-3 w-72 h-28 bg-[#212121] border border-border/60 rounded-lg overflow-hidden">
      <div className="relative w-16 flex-shrink-0 rounded overflow-hidden bg-bg-secondary">
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <Film size={20} className="" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-status-completed">감상</span>
          <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
            <Star size={10} className="text-yellow-500 fill-yellow-500" />
            4.2
          </span>
        </div>
        <h3 className="text-sm font-semibold text-text-primary line-clamp-1">콘텐츠 제목</h3>
        <p className="text-xs line-clamp-2 mt-1">
          리뷰 내용이 여기에...
        </p>
      </div>
    </div>
  );
}
// #endregion

// #region 메인 컴포넌트
export default function ContentCardsPreview() {
  const [activeView, setActiveView] = useState<"unified" | "page" | "component">("unified");
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set([1]));

  const toggleSelect = (id: number) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-10">
      {/* 뷰 전환 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveView("unified")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeView === "unified"
              ? "bg-accent text-bg-main"
              : "bg-white/5 text-text-secondary hover:text-text-primary"
          }`}
        >
          통합 카드 (ContentCard)
        </button>
        <button
          onClick={() => setActiveView("page")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeView === "page"
              ? "bg-accent text-bg-main"
              : "bg-white/5 text-text-secondary hover:text-text-primary"
          }`}
        >
          페이지별 보기
        </button>
        <button
          onClick={() => setActiveView("component")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeView === "component"
              ? "bg-accent text-bg-main"
              : "bg-white/5 text-text-secondary hover:text-text-primary"
          }`}
        >
          기존 컴포넌트
        </button>
      </div>

      {/* 통합 카드 프리뷰 */}
      {activeView === "unified" && (
        <UnifiedView selectedCards={selectedCards} toggleSelect={toggleSelect} />
      )}

      {/* 샘플 프리뷰 */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-accent">카드 형태 미리보기</h3>
        <div className="flex flex-wrap gap-6 p-5 bg-white/[0.02] rounded-xl border border-white/5">
          <div className="space-y-2">
            <span className="text-[10px] text-accent/60 uppercase">포스터형 (2:3)</span>
            <SamplePosterCard />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-accent/60 uppercase">가로형 (PC)</span>
            <SampleHorizontalCard />
          </div>
        </div>
      </section>

      {/* 페이지별 보기 */}
      {activeView === "page" && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-accent">페이지별 카드 사용처</h3>
          <div className="space-y-4">
            {PAGE_CARD_MAP.map((page) => (
              <div
                key={page.url}
                className="p-4 bg-white/[0.02] rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <code className="px-2 py-1 bg-accent/10 rounded text-xs text-accent font-mono">
                    {page.url}
                  </code>
                  <span className="text-sm font-medium text-text-primary">{page.pageName}</span>
                </div>
                <div className="space-y-2">
                  {page.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 pl-4 border-l-2 border-white/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text-primary">{section.name}</span>
                          <span className="px-1.5 py-0.5 bg-purple-500/20 rounded text-[10px] text-purple-400 font-mono">
                            {section.card}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5">{section.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 컴포넌트별 보기 */}
      {activeView === "component" && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-accent">카드 컴포넌트 목록 ({CARD_COMPONENTS.length}개)</h3>
          <div className="space-y-3">
            {CARD_COMPONENTS.map((card) => {
              const usedPages = PAGE_CARD_MAP.filter((p) =>
                p.sections.some((s) => s.card.includes(card.name))
              );
              return (
                <div
                  key={card.name}
                  className="p-4 bg-white/[0.02] rounded-xl border border-white/5"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{card.name}</h4>
                      <p className="text-xs mt-0.5">{card.description}</p>
                    </div>
                    <span className="px-2 py-1 bg-accent/10 rounded text-[10px] text-accent">
                      {card.imageRatio}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <FileCode size={12} className="" />
                    <code className="text-text-secondary font-mono">@/{card.path}</code>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {usedPages.map((p) => (
                      <span
                        key={p.url}
                        className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-text-secondary"
                      >
                        {p.pageName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 요약 테이블 */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-accent">한눈에 보기</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-text-secondary font-medium">페이지</th>
                <th className="text-left py-2 px-3 text-text-secondary font-medium">위치</th>
                <th className="text-left py-2 px-3 text-text-secondary font-medium">카드</th>
              </tr>
            </thead>
            <tbody>
              {PAGE_CARD_MAP.flatMap((page) =>
                page.sections.map((section, idx) => (
                  <tr key={`${page.url}-${idx}`} className="border-b border-white/5">
                    <td className="py-2 px-3 text-text-primary">{page.pageName}</td>
                    <td className="py-2 px-3 text-text-secondary">{section.name}</td>
                    <td className="py-2 px-3">
                      <code className="text-purple-400">{section.card}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 통합 완료 */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-accent">통합 완료</h3>
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
          <ul className="text-xs text-text-secondary space-y-1.5">
            <li>• <code className="text-red-400 line-through">ContentCompactCard</code> → <code className="text-purple-400">ContentCard</code> (saved, topRightNode 슬롯)</li>
            <li>• <code className="text-red-400 line-through">SelectableContentCard</code> → <code className="text-purple-400">ContentCard</code> (selectable 슬롯)</li>
            <li>• <code className="text-red-400 line-through">RecordCard</code> → <code className="text-purple-400">ContentCard</code> (리뷰 모드: headerNode, saved/addable)</li>
            <li>• <code className="text-red-400 line-through">ScriptureCard</code> → <code className="text-purple-400">ContentCard</code> (인라인 래퍼 패턴)</li>
            <li>• <code className="text-red-400 line-through">ReviewCard</code> → <code className="text-purple-400">ContentCard</code> (인라인 래퍼 패턴)</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
// #endregion
