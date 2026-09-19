/* ─────────────────────────────────────────────
 * [celeb 상세] faction — 소속 세력도감
 * - 목차 위치: connections > faction
 * - 데이터: memberships(이 인물의 배정)/factions(테마+명단)/currentCelebId props
 * - 함께 보기: faction/FactionMembershipCard.tsx, PeopleAndEraTabs.tsx
 *
 * 탐색 세력도감 페이지와 같은 뼈대다 — 공용 선택기(ExploreNav)에서 세력을 고르면
 * 그 세력 한 개의 도감 화면(중앙 제목·소개·이 인물의 위치·인물 격자)이 선다.
 * 진영이 둘 이상인 세력은 진영 줄이 함께 서서 한 진영씩 본다.
 * 동료 인물을 누르면 도감 페이지와 같은 인물 소개 모달(FactionMemberModal)이 뜬다.
 * ───────────────────────────────────────────── */
"use client";

import { lazy, Suspense, useState } from "react";
import { LoaderCircle, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { FeaturedCeleb, FeaturedFaction } from "@/actions/home/getFeaturedFactions";
import type { FactionItem } from "@/actions/user/getCelebBySlug";
import type { FactionMemberMeta } from "@/components/features/faction/entry/FactionMemberModal";
import ExploreNav, { type ExploreNavRow } from "@/components/shared/ExploreNav";
import { Z_INDEX } from "@/constants/zIndex";
import {
  buildFactionClusters,
  localizedFactionName,
  type FactionCluster,
} from "@/lib/faction-sections";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

import FactionMembershipCard from "./faction/FactionMembershipCard";

const FactionMemberModal = lazy(
  () => import("@/components/features/faction/entry/FactionMemberModal"),
);

const UNGROUPED_KEY = "__ungrouped";
const clusterKeyOf = (cluster: FactionCluster) => cluster.name ?? UNGROUPED_KEY;

interface FactionSectionProps {
  factions: FeaturedFaction[];
  memberships: FactionItem[];
  currentCelebId: string;
  /** 페이지 주인 — 「이 인물의 위치」 머리에 이름과 얼굴을 세운다 */
  ownerName: string;
  ownerAvatarUrl: string | null;
}

interface MemberModalState {
  faction: FeaturedFaction;
  celeb: CelebProfile;
  meta: FactionMemberMeta;
}

export default function FactionSection({
  factions,
  memberships,
  currentCelebId,
  ownerName,
  ownerAvatarUrl,
}: FactionSectionProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("celebPage");
  const tp = useTranslations("pending");
  const [modal, setModal] = useState<MemberModalState | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [modalError, setModalError] = useState(false);
  // 도감 선택 상태 — 세력 하나, 그 안의 진영 하나
  const [activeFactionId, setActiveFactionId] = useState<string | null>(null);
  const [clusterKey, setClusterKey] = useState<string | null>(null);

  // 배정 차례대로 세력을 세운다 — 테마 자료가 빠진 배정은 건너뛴다
  const cards = memberships.flatMap((membership) => {
    const faction = factions.find((entry) => entry.id === membership.id);
    return faction ? [{ membership, faction }] : [];
  });

  if (cards.length === 0) return null;

  const active = cards.find(({ faction }) => faction.id === activeFactionId) ?? cards[0];
  const coMembers = active.faction.celebs.filter((celeb) => celeb.id !== currentCelebId);
  const clusters = buildFactionClusters(coMembers, locale);
  const showClusterRow = clusters.filter((cluster) => cluster.label).length >= 2;
  // 페이지 주인이 속한 진영 — 기본 선택이고 탭에 인물 표시를 달아 둔다
  const ownerClusterName =
    active.faction.celebs.find((celeb) => celeb.id === currentCelebId)?.group_label ?? null;
  const ownerCluster = ownerClusterName
    ? clusters.find((cluster) => cluster.name === ownerClusterName)
    : undefined;
  const activeCluster =
    clusters.find((cluster) => clusterKeyOf(cluster) === clusterKey) ??
    ownerCluster ??
    clusters[0];

  const byId = new Map(coMembers.map((celeb) => [celeb.id, celeb]));
  const shownMembers = showClusterRow && activeCluster
    ? activeCluster.celebIds.flatMap((id) => {
        const celeb = byId.get(id);
        return celeb ? [celeb] : [];
      })
    : coMembers;

  const selectFaction = (factionId: string) => {
    setActiveFactionId(factionId);
    setClusterKey(null);
  };

  // 도감 페이지와 같은 선택기 줄 — 세력은 네모 칩(세력 고유색), 진영은 밑줄 탭
  const navRows: ExploreNavRow[] = [];
  if (cards.length > 1) {
    navRows.push({
      id: "factions",
      label: t("faction"),
      shape: "square",
      activeId: active.faction.id,
      items: cards.map(({ faction }) => ({
        id: faction.id,
        name: localizedFactionName(faction, locale),
        count: faction.celebs.length,
        // 세력 고유색은 점으로만 보인다 — 어두운 색을 글자·테두리에 쓰면 읽히지 않는다
        icon: (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: faction.color ?? "transparent" }}
          />
        ),
      })),
      onSelect: selectFaction,
    });
  }
  if (showClusterRow) {
    navRows.push({
      id: "clusters",
      label: t("factionCluster"),
      shape: "tab",
      wide: true,
      activeId: clusterKeyOf(activeCluster),
      items: clusters.map((cluster) => ({
        id: clusterKeyOf(cluster),
        name: cluster.label ?? t("factionClusterOthers"),
        count: cluster.celebIds.length,
        // 페이지 주인이 속한 진영에는 인물 표시를 단다
        icon:
          cluster === ownerCluster ? (
            <User size={12} aria-hidden className="text-accent" />
          ) : undefined,
      })),
      onSelect: setClusterKey,
    });
  }

  const openMember = async (member: FeaturedCeleb) => {
    if (pendingMemberId) return;

    setPendingMemberId(member.id);
    setModalError(false);
    try {
      const detail = await getCelebForModal(member.id, active.faction.id);
      if (!detail) {
        setModalError(true);
        return;
      }
      const meta: FactionMemberMeta = {
        // 영문 역할이 비면 한국어를 내보내지 않는다 — 도감 페이지와 같은 규칙
        role:
          (locale === "en" ? member.short_desc_en : member.short_desc)?.trim() ||
          null,
        group:
          clusters.length > 1
            ? (locale === "en"
                ? member.group_label_en?.trim() || member.group_label
                : member.group_label) ?? null
            : null,
      };
      setModal({ faction: active.faction, celeb: detail, meta });
    } catch (error) {
      console.error("[FactionSection] Failed to load celeb detail:", error);
      setModalError(true);
    } finally {
      setPendingMemberId(null);
    }
  };

  return (
    <div className="space-y-5 pt-4 md:space-y-6 md:pt-6">
      {navRows.length > 0 && <ExploreNav rows={navRows} />}

      <FactionMembershipCard
        key={active.faction.id}
        faction={active.faction}
        membership={active.membership}
        locale={locale}
        ownerName={ownerName}
        ownerAvatarUrl={ownerAvatarUrl}
        members={shownMembers}
        pendingMemberId={pendingMemberId}
        onOpenMember={(member) => void openMember(member)}
      />

      {modalError && (
        <p role="alert" className="text-center text-xs leading-5 text-red-200">
          {tp("failed")}
        </p>
      )}

      {modal && (
        <Suspense
          fallback={
            <div
              className="fixed inset-0 grid place-items-center bg-black/75 backdrop-blur-sm"
              style={{ zIndex: Z_INDEX.modal }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 border border-white/15 bg-bg-main px-5 py-4 text-sm font-semibold text-white">
                <LoaderCircle size={18} className="animate-spin text-accent" aria-hidden />
                {tp("loading")}
              </div>
            </div>
          }
        >
          <FactionMemberModal
            factionId={modal.faction.id}
            factionName={localizedFactionName(modal.faction, locale)}
            celeb={modal.celeb}
            meta={modal.meta}
            onClose={() => setModal(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
