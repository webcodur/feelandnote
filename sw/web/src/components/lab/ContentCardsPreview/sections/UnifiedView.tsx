/*
  UnifiedView - ContentCard 슬롯 기반 통합 카드 프리뷰
*/

"use client";

import { Plus } from "lucide-react";
import ContentCard from "@/components/ui/cards/ContentCard";

interface UnifiedViewProps {
  selectedCards: Set<number>;
  toggleSelect: (id: number) => void;
}

export default function UnifiedView({ selectedCards, toggleSelect }: UnifiedViewProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-accent">ContentCard - 슬롯 기반 통합 카드</h3>
        <p className="text-xs">모든 기능을 on/off 조합하여 사용 가능</p>
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
                contentId="demo-basic"
                title="데미안"
                creator="헤르만 헤세"
                contentType="BOOK"
              />
            </div>
            <div className="flex-1 text-xs">
              <code className="text-purple-400">{`<ContentCard title="..." creator="..." />`}</code>
            </div>
          </div>
        </div>

        {/* 인덱스 + 통계 + 평균별점 (작품 스타일) */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <h4 className="text-sm font-medium text-text-primary mb-3">통계 + 평균별점 (작품 스타일)</h4>
          <div className="flex gap-4">
            <div className="w-28">
              <ContentCard
                contentId="test-content-id"
                title="사피엔스"
                creator="유발 하라리"
                contentType="BOOK"
                rating={4.7}
                onStatsClick={(e) => { e.stopPropagation(); alert("통계 모달 열기"); }}
              />
            </div>
            <div className="flex-1 text-xs space-y-1">
              <code className="text-purple-400 block">{`contentId="..." // 인원 구성 뱃지 자동 조회`}</code>
              <code className="text-purple-400 block">{`rating={4.7}`}</code>
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
                  contentId="demo-1984"
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
                  contentId="demo-brave-new-world"
                  title="멋진 신세계"
                  creator="올더스 헉슬리"
                  contentType="BOOK"
                  selectable
                  isSelected={selectedCards.has(2)}
                  onSelect={() => toggleSelect(2)}
                />
              </div>
            </div>
            <div className="flex-1 text-xs space-y-1">
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
                contentId="demo-interstellar"
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
            <div className="flex-1 text-xs space-y-1">
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
                contentId="demo-zelda"
                title="젤다의 전설"
                creator="닌텐도"
                contentType="GAME"
                saved
              />
            </div>
            <div className="flex-1 text-xs">
              <code className="text-purple-400">{`saved`}</code>
            </div>
          </div>
        </div>

        {/* 추천 가능 (감상 완료 스타일) */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <h4 className="text-sm font-medium text-text-primary mb-3">추천 가능 (감상 완료 스타일)</h4>
          <div className="flex gap-4">
            <div className="w-28">
              <ContentCard
                contentId="demo-iu-album"
                title="아이유 5집"
                creator="아이유"
                contentType="MUSIC"
                recommendable
                userContentId="preview-demo"
              />
            </div>
            <div className="flex-1 text-xs space-y-1">
              <code className="text-purple-400 block">{`recommendable`}</code>
              <code className="text-purple-400 block">{`userContentId="..."`}</code>
            </div>
          </div>
        </div>

        {/* 3:4 비율 */}
        <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <h4 className="text-sm font-medium text-text-primary mb-3">3:4 비율</h4>
          <div className="flex gap-4">
            <div className="w-28">
              <ContentCard
                contentId="demo-aspect-ratio"
                title="콘텐츠 제목"
                creator="작가명"
                contentType="VIDEO"
                aspectRatio="3/4"
                rating={4.2}
              />
            </div>
            <div className="flex-1 text-xs">
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
            <tbody className="">
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
  );
}
