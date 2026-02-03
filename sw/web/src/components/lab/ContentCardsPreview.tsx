/*
  파일명: /components/lab/ContentCardsPreview.tsx
  기능: 컨텐츠 카드 컴포넌트 가이드
  책임: 페이지별 컨텐츠 카드 사용처 안내
*/

"use client";

import { useState } from "react";
import { Book, Film, Star, FileCode, Plus } from "lucide-react";
import ContentCard from "@/components/ui/cards/ContentCard";

// #region 페이지별 카드 데이터
interface PageCardInfo {
  url: string;
  pageName: string;
  sections: {
    name: string;
    card: string;
    description: string;
  }[];
}

const PAGE_CARD_MAP: PageCardInfo[] = [
  {
    url: "/",
    pageName: "홈",
    sections: [
      {
        name: "기록관 프리뷰",
        card: "ContentCard",
        description: "내 기록 미리보기. 리뷰 모드 사용.",
      },
    ],
  },
  {
    url: "/(standalone)/search",
    pageName: "검색",
    sections: [
      {
        name: "검색 결과 (콘텐츠)",
        card: "ContentCard",
        description: "도서/영상/게임/음악 검색 결과. saved, topRightNode 슬롯 사용.",
      },
    ],
  },
  {
    url: "/[userId]/records",
    pageName: "기록관",
    sections: [
      {
        name: "일반 콘텐츠 목록",
        card: "ContentCard",
        description: "도서/영상/게임/음악 기록. 리뷰 모드 (PC: 이미지+리뷰, MB: 포스터형).",
      },
      {
        name: "자격증 섹션",
        card: "CertificateCard",
        description: "자격증 전용 카드. 그라데이션 배경 + 골드 스탬프.",
      },
    ],
  },
  {
    url: "/[userId]/interests",
    pageName: "관심 목록",
    sections: [
      {
        name: "일반 콘텐츠",
        card: "InterestCard",
        description: "관심(WANT) 등록한 콘텐츠. 가로 레이아웃.",
      },
      {
        name: "자격증 섹션",
        card: "CertificateCard",
        description: "관심 자격증 전용.",
      },
    ],
  },
  {
    url: "/[userId]/collections/[id]",
    pageName: "컬렉션 상세",
    sections: [
      {
        name: "콘텐츠 선택 모달",
        card: "ContentCard",
        description: "컬렉션 편집 시 콘텐츠 선택. selectable 슬롯 사용.",
      },
    ],
  },
  {
    url: "/scriptures",
    pageName: "경전 (지혜의 서고)",
    sections: [
      {
        name: "공통 서가",
        card: "ContentCard",
        description: "전체 셀럽의 추천 콘텐츠. index/celebCount/userCount/avgRating 슬롯 사용.",
      },
      {
        name: "길의 갈래 (분야별)",
        card: "ContentCard",
        description: "직업/분야별 콘텐츠 분류. 인라인 래퍼로 모달 연동.",
      },
      {
        name: "오늘의 인물",
        card: "ContentCard",
        description: "데일리 셀럽 추천 콘텐츠.",
      },
      {
        name: "세대의 경전 (시대별)",
        card: "ContentCard",
        description: "시대별 콘텐츠 분류.",
      },
    ],
  },
  {
    url: "/agora/celeb-feed",
    pageName: "셀럽 피드",
    sections: [
      {
        name: "셀럽 리뷰 피드",
        card: "ContentCard",
        description: "셀럽들의 콘텐츠 리뷰. 인라인 래퍼로 프로필 헤더 + 저장 버튼 + 리뷰모드.",
      },
    ],
  },
  {
    url: "/agora/friend-feed",
    pageName: "친구 활동",
    sections: [
      {
        name: "친구 활동 피드",
        card: "ContentCard",
        description: "팔로우한 친구들의 기록. 인라인 래퍼로 프로필 헤더 + 저장 버튼 + 리뷰모드.",
      },
    ],
  },
  {
    url: "/notifications",
    pageName: "알림",
    sections: [
      {
        name: "추천 알림",
        card: "RecommendationCard",
        description: "받은 추천 표시. 수락/거절 버튼 포함.",
      },
    ],
  },
];

// 카드 컴포넌트 정보
interface CardComponentInfo {
  name: string;
  path: string;
  imageRatio: string;
  description: string;
}

const CARD_COMPONENTS: CardComponentInfo[] = [
  {
    name: "ContentCard",
    path: "components/ui/cards/ContentCard.tsx",
    imageRatio: "2:3 / 3:4 / 가로형(리뷰)",
    description: "통합 카드. 슬롯 기반 + 리뷰 모드로 모든 콘텐츠 카드 대체.",
  },
  {
    name: "InterestCard",
    path: "components/features/user/contentLibrary/item/InterestCard.tsx",
    imageRatio: "가로형",
    description: "관심 목록 전용 가로 레이아웃.",
  },
  {
    name: "CertificateCard",
    path: "components/ui/cards/CertificateCard.tsx",
    imageRatio: "그라데이션",
    description: "자격증 전용 특수 디자인.",
  },
  {
    name: "RecommendationCard",
    path: "components/features/recommendations/RecommendationCard.tsx",
    imageRatio: "가로형",
    description: "추천 알림용. 수락/거절 버튼.",
  },
];
// #endregion

// #region 샘플 카드 컴포넌트
function SamplePosterCard() {
  return (
    <div className="w-28 bg-[#212121] border border-border/60 rounded-lg overflow-hidden">
      <div className="aspect-[2/3] overflow-hidden relative bg-bg-secondary">
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <Book size={28} className="text-text-tertiary" />
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
          <Film size={20} className="text-text-tertiary" />
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
        <p className="text-xs text-text-tertiary line-clamp-2 mt-1">
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
        <section className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-accent">ContentCard - 슬롯 기반 통합 카드</h3>
            <p className="text-xs text-text-tertiary">모든 기능을 on/off 조합하여 사용 가능</p>
          </div>

          {/* 슬롯 구조 설명 */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-text-primary mb-3">슬롯 구조</h4>
            <pre className="text-xs text-text-secondary font-mono bg-black/30 p-3 rounded-lg overflow-x-auto">
{`┌─────────────────────────────┐
│ [좌상단]           [우상단] │
│  index             rating   │
│  selectable        topRight │
│  saved             Node     │
│                             │
│         썸네일 이미지        │
│                             │
│ [좌하단]           [우하단] │
│  celebCount        avgRating│
│  userCount         checkbox │
│  ────그라데이션 오버레이──── │
└─────────────────────────────┘
│       제목 / 작가           │
└─────────────────────────────┘`}
            </pre>
          </div>

          {/* 슬롯별 조합 예시 */}
          <div className="space-y-6">
            {/* 기본 */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">기본 (슬롯 없음)</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="데미안"
                    creator="헤르만 헤세"
                    contentType="BOOK"
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary">
                  <code className="text-purple-400">{`<ContentCard title="..." creator="..." />`}</code>
                </div>
              </div>
            </div>

            {/* 인덱스 + 통계 + 평균별점 (경전 스타일) */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">인덱스 + 통계 + 평균별점 (경전 스타일)</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="사피엔스"
                    creator="유발 하라리"
                    contentType="BOOK"
                    index={1}
                    celebCount={12}
                    userCount={340}
                    avgRating={4.7}
                    onStatsClick={(e) => { e.stopPropagation(); alert("통계 모달 열기"); }}
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary space-y-1">
                  <code className="text-purple-400 block">{`index={1}`}</code>
                  <code className="text-purple-400 block">{`celebCount={12} userCount={340}`}</code>
                  <code className="text-purple-400 block">{`avgRating={4.7}`}</code>
                  <code className="text-purple-400 block">{`onStatsClick={...}`}</code>
                </div>
              </div>
            </div>

            {/* 선택 모드 (컬렉션 편집 스타일) */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">선택 모드 (컬렉션 편집 스타일)</h4>
              <div className="flex gap-4">
                <div className="flex gap-3">
                  <div className="w-28">
                    <ContentCard
                      title="1984"
                      creator="조지 오웰"
                      contentType="BOOK"
                      selectable
                      isSelected={selectedCards.has(1)}
                      onSelect={() => toggleSelect(1)}
                    />
                  </div>
                  <div className="w-28">
                    <ContentCard
                      title="멋진 신세계"
                      creator="올더스 헉슬리"
                      contentType="BOOK"
                      selectable
                      isSelected={selectedCards.has(2)}
                      onSelect={() => toggleSelect(2)}
                    />
                  </div>
                </div>
                <div className="flex-1 text-xs text-text-tertiary space-y-1">
                  <code className="text-purple-400 block">{`selectable`}</code>
                  <code className="text-purple-400 block">{`isSelected={...}`}</code>
                  <code className="text-purple-400 block">{`onSelect={() => ...}`}</code>
                  <p className="mt-2 text-text-secondary">클릭해서 선택/해제 테스트</p>
                </div>
              </div>
            </div>

            {/* 별점 + 액션 버튼 (기록관 스타일) */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">별점 + 액션 버튼 (기록관 스타일)</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="인터스텔라"
                    creator="크리스토퍼 놀란"
                    contentType="VIDEO"
                    rating={4.8}
                    topRightNode={
                      <button className="p-1.5 rounded-full bg-black/50 hover:bg-accent text-white">
                        <Plus size={14} />
                      </button>
                    }
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary space-y-1">
                  <code className="text-purple-400 block">{`rating={4.8}`}</code>
                  <code className="text-purple-400 block">{`topRightNode={<Button />}`}</code>
                </div>
              </div>
            </div>

            {/* 보관됨 뱃지 (검색 결과 스타일) */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">보관됨 뱃지 (검색 결과 스타일)</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="젤다의 전설"
                    creator="닌텐도"
                    contentType="GAME"
                    saved
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary">
                  <code className="text-purple-400">{`saved`}</code>
                </div>
              </div>
            </div>

            {/* 우하단 체크박스 (일괄 선택) */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">우하단 체크박스 (일괄 선택)</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="아이유 5집"
                    creator="아이유"
                    contentType="MUSIC"
                    bottomRightCheckbox
                    isBottomRightSelected={selectedCards.has(3)}
                    onBottomRightSelect={(e) => { e.stopPropagation(); toggleSelect(3); }}
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary space-y-1">
                  <code className="text-purple-400 block">{`bottomRightCheckbox`}</code>
                  <code className="text-purple-400 block">{`isBottomRightSelected={...}`}</code>
                  <code className="text-purple-400 block">{`onBottomRightSelect={...}`}</code>
                </div>
              </div>
            </div>

            {/* 3:4 비율 */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <h4 className="text-sm font-medium text-text-primary mb-3">3:4 비율</h4>
              <div className="flex gap-4">
                <div className="w-28">
                  <ContentCard
                    title="콘텐츠 제목"
                    creator="작가명"
                    contentType="VIDEO"
                    aspectRatio="3/4"
                    rating={4.2}
                  />
                </div>
                <div className="flex-1 text-xs text-text-tertiary">
                  <code className="text-purple-400">{`aspectRatio="3/4"`}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Props 레퍼런스 */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-text-primary mb-3">Props 레퍼런스</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-text-secondary">Prop</th>
                    <th className="text-left py-2 px-2 text-text-secondary">타입</th>
                    <th className="text-left py-2 px-2 text-text-secondary">슬롯</th>
                    <th className="text-left py-2 px-2 text-text-secondary">설명</th>
                  </tr>
                </thead>
                <tbody className="text-text-tertiary">
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>index</code></td><td>number</td><td>좌상단</td><td>순위 뱃지</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>selectable</code></td><td>boolean</td><td>좌상단</td><td>체크박스 모드</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>saved</code></td><td>boolean</td><td>좌상단</td><td>보관됨 뱃지</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>rating</code></td><td>number</td><td>우상단</td><td>별점 뱃지</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>topRightNode</code></td><td>ReactNode</td><td>우상단</td><td>커스텀 노드</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>celebCount</code></td><td>number</td><td>좌하단</td><td>셀럽 수 뱃지</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>userCount</code></td><td>number</td><td>좌하단</td><td>유저 수 (셀럽과 함께)</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>avgRating</code></td><td>number</td><td>우하단</td><td>평균 별점</td></tr>
                  <tr className="border-b border-white/5"><td className="py-1.5 px-2"><code>bottomRightCheckbox</code></td><td>boolean</td><td>우하단</td><td>일괄선택 체크박스</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
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
                        <p className="text-xs text-text-tertiary mt-0.5">{section.description}</p>
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
                      <p className="text-xs text-text-tertiary mt-0.5">{card.description}</p>
                    </div>
                    <span className="px-2 py-1 bg-accent/10 rounded text-[10px] text-accent">
                      {card.imageRatio}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <FileCode size={12} className="text-text-tertiary" />
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
            <li>• <code className="text-red-400 line-through">RecordCard</code> → <code className="text-purple-400">ContentCard</code> (리뷰 모드: headerNode, actionNode)</li>
            <li>• <code className="text-red-400 line-through">ScriptureCard</code> → <code className="text-purple-400">ContentCard</code> (인라인 래퍼 패턴)</li>
            <li>• <code className="text-red-400 line-through">ReviewCard</code> → <code className="text-purple-400">ContentCard</code> (인라인 래퍼 패턴)</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
// #endregion
