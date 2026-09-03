/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 탐색기 상태·조립을 쥐는 루트 뷰
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: data(InfluenceExplorerData) props, useCelebPreview("influence") 액션
 * - 함께 보기: RankingSection.tsx, LeadersSection.tsx, InfluenceRankModal.tsx, CelebDetailModal, useCelebPreview.ts
 * ───────────────────────────────────────────── */

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { InfluenceField } from "@feelandnote/influence-constants";

import type {
  InfluenceExplorerData,
  InfluenceExplorerPerson,
} from "@/actions/home/getInfluenceExplorer";

import type { InfluenceRankDetail } from "../InfluenceRankModal";
import { useCelebPreview } from "../useCelebPreview";
import { getStrongestDomain, type ExplorerSelection } from "./influence-helpers";
import LeadersSection from "./LeadersSection";
import RankingSection from "./RankingSection";

const CelebDetailModal = dynamic(
  () => import("@/components/features/celeb/modals/CelebDetailModal"),
);

const InfluenceRankModal = dynamic(() => import("../InfluenceRankModal"));

interface Props {
  data: InfluenceExplorerData;
}

export default function InfluenceExplorerView({ data }: Props) {
  /* ── 1. 상태·인물 미리보기 훅 ── */
  const [activeField, setActiveField] = useState<InfluenceField>(() =>
    getStrongestDomain(data.current),
  );
  const [selection, setSelection] = useState<ExplorerSelection | null>(null);
  const [rankDetail, setRankDetail] = useState<InfluenceRankDetail | null>(null);
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("influence");
  const rankingScrollerRef = useRef<HTMLDivElement>(null);
  const currentRankRef = useRef<HTMLLIElement>(null);

  const activeLeaders = data.leaders[activeField];

  /* ── 2. 스크롤·열기·닫기 동작 ── */
  useEffect(() => {
    const scroller = rankingScrollerRef.current;
    const current = currentRankRef.current;
    if (!scroller || !current) return;
    scroller.scrollLeft =
      current.offsetLeft - (scroller.clientWidth - current.offsetWidth) / 2;
  }, []);

  const openPerson = async (
    person: InfluenceExplorerPerson,
    nextSelection: ExplorerSelection,
  ) => {
    setSelection(nextSelection);
    const nextCeleb = await openCelebPreview(person.id);
    if (!nextCeleb) setSelection(null);
  };

  const navigatePreview = async (direction: "prev" | "next") => {
    if (!selection || loadingId) return;
    const nextIndex = selection.index + (direction === "prev" ? -1 : 1);
    const nextPerson = selection.people[nextIndex];
    if (!nextPerson) return;
    const nextCeleb = await openCelebPreview(nextPerson.id);
    if (nextCeleb) setSelection({ ...selection, index: nextIndex });
  };

  const closePreview = () => {
    closeCelebPreview();
    setSelection(null);
  };

  return (
    <div className="space-y-7 border-t border-white/[0.08] pt-6">
      {/* ── 3. 두 구획 조립 ── */}
      <RankingSection
        data={data}
        loadingId={loadingId}
        scrollerRef={rankingScrollerRef}
        currentRankRef={currentRankRef}
        onOpenPerson={(person, nextSelection) =>
          void openPerson(person, nextSelection)
        }
        onOpenRankDetail={setRankDetail}
      />

      <LeadersSection
        activeField={activeField}
        leaders={activeLeaders}
        currentId={data.current.id}
        loadingId={loadingId}
        onActiveFieldChange={setActiveField}
        onOpenPerson={(person, nextSelection) =>
          void openPerson(person, nextSelection)
        }
        onOpenRankDetail={setRankDetail}
      />

      {/* ── 4. 오버레이(인물 상세·순위 상세 모달) ── */}
      {previewCeleb && selection ? (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closePreview}
          onNavigate={(direction) => void navigatePreview(direction)}
          hasPrev={selection.index > 0}
          hasNext={selection.index < selection.people.length - 1}
        />
      ) : null}

      <InfluenceRankModal
        detail={rankDetail}
        onClose={() => setRankDetail(null)}
      />
    </div>
  );
}
