/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 탐색기 상태·조립을 쥐는 루트 뷰
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: data(InfluenceExplorerData) props, useCelebPreview("influence") 액션
 * - 함께 보기: RankingSection.tsx, LeadersSection.tsx, InfluenceRankModal.tsx, CelebDetailModal, useCelebPreview.ts
 * ───────────────────────────────────────────── */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Modal, { ModalBody } from "@/components/ui/Modal";
import type { InfluenceField } from "@feelandnote/influence-constants";
import { INFLUENCE_FIELDS } from "@feelandnote/influence-constants";

import type {
  InfluenceExplorerData,
  InfluenceExplorerPerson,
} from "@/actions/home/getInfluenceExplorer";

import type { InfluenceRankDetail } from "../InfluenceRankModal";
import { useCelebPreview } from "../useCelebPreview";
import { getStrongestDomain, type ExplorerSelection } from "./influence-helpers";
import LeadersSection from "./LeadersSection";
import RankingSection from "./RankingSection";

/* ssr 없는 dynamic — 일반 dynamic은 첫 청크를 불러올 때 suspend해 라우트 Suspense가
   페이지 전체를 숨긴다. 모달은 열릴 때만 의미가 있어 클라이언트 로딩으로 충분하다. */
const CelebDetailModal = dynamic(
  () => import("@/components/features/celeb/modals/CelebDetailModal"),
  { ssr: false },
);

const InfluenceRankModal = dynamic(() => import("../InfluenceRankModal"), {
  ssr: false,
});

interface Props {
  data: InfluenceExplorerData;
  onClose: () => void;
  initialMode?: "ranking" | "leaders";
}

export default function InfluenceExplorerView({ data, onClose, initialMode = "ranking" }: Props) {
  const t = useTranslations("profilePage.influence.explorer");
  const tc = useTranslations("celebPage");
  const [mode, setMode] = useState<"ranking" | "leaders">(initialMode);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
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

  const activeLeaders = data.leaders[activeField];

  /* ── 2. 스크롤·열기·닫기 동작 ── */
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
    <>
      <Modal isOpen={!previewCeleb && !rankDetail && !fieldPickerOpen} onClose={onClose} title={tc("influenceComparison")} size="full" stickyHeader animateHeight={false}>
        <ModalBody className="space-y-4">
          <div className="mx-auto flex w-fit gap-1 rounded-control border border-line bg-bg-raised p-1">
            {(["ranking", "leaders"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-11 rounded-control px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === value ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-bg-card hover:text-text-primary"}`}>
                {t(value === "ranking" ? "rankingMode" : "leadersMode")}
              </button>
            ))}
          </div>
          {mode === "ranking" ? (
            <RankingSection
              data={data}
              loadingId={loadingId}
              onOpenPerson={(person, nextSelection) => void openPerson(person, nextSelection)}
              onOpenRankDetail={setRankDetail}
            />
          ) : (
            <LeadersSection
              activeField={activeField}
              leaders={activeLeaders}
              currentId={data.current.id}
              loadingId={loadingId}
              onActiveFieldChange={setActiveField}
              onChooseField={() => setFieldPickerOpen(true)}
              onOpenPerson={(person, nextSelection) => void openPerson(person, nextSelection)}
              onOpenRankDetail={setRankDetail}
            />
          )}
        </ModalBody>
      </Modal>
      <Modal isOpen={fieldPickerOpen} onClose={() => setFieldPickerOpen(false)} title={t("fieldTabs")} size="sm" stickyHeader animateHeight={false}>
        <ModalBody className="grid grid-cols-2 gap-2">
          {INFLUENCE_FIELDS.map((field) => (
            <button key={field} type="button" aria-pressed={activeField === field} onClick={() => { setActiveField(field); setFieldPickerOpen(false); }} className={`min-h-11 rounded-control border border-line px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${activeField === field ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-bg-raised hover:text-text-primary"}`}>
              {t(`shortFields.${field}`)}
            </button>
          ))}
        </ModalBody>
      </Modal>

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
    </>
  );
}
