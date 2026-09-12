"use client";

import { useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythGroup, MythRegion, MythTradition } from "@/actions/home/mythAtlasTypes";
import BottomSheet from "@/components/ui/BottomSheet";
import { FILTER_BOTTOMSHEET_STYLES } from "@/constants/filterStyles";
import { mythGroupName } from "./mythGroupName";
import { MYTH_LAYOUT as layout } from "./mythLayout";

interface Props {
  regions: MythRegion[];
  activeRegion: MythRegion;
  traditions: MythTradition[];
  activeTradition: MythTradition | null;
  comingSoonId: string | null;
  onChooseRegion: (id: string) => void;
  onChooseTradition: (id: string) => void;
  onComingSoon: (id: string) => void;
  /** 인물 묶음. 비어 있으면 그룹 버튼을 두지 않는다 */
  groups: MythGroup[];
  activeGroup: MythGroup | null;
  /** null이면 「전체」 */
  onChooseGroup: (id: string | null) => void;
}

/* 모바일 지역·신화·그룹 고르기 — 이름이 긴 칩을 옆으로 넘기며 찾기 어려워 버튼으로 접고,
   누르면 아래에서 올라오는 창에서 고른다(FilterTabs와 같은 방식). PC는 칩·탭 줄을 그대로 쓴다 */
export default function MythMobilePicker({
  regions,
  activeRegion,
  traditions,
  activeTradition,
  comingSoonId,
  onChooseRegion,
  onChooseTradition,
  onComingSoon,
  groups,
  activeGroup,
  onChooseGroup,
}: Props) {
  const t = useTranslations("explore.hub.myth");
  const [sheet, setSheet] = useState<"region" | "tradition" | "group" | null>(null);
  const close = () => setSheet(null);
  const groupName = (group: MythGroup | null) => mythGroupName(group, { other: t("otherGroup"), unnamed: t("unnamedGroup") });
  const groupLabel = activeGroup ? groupName(activeGroup) : t("allGroups");

  return (
    <>
      <div className={layout.mobilePicker}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${t("regionNav")}: ${activeRegion.name}`}
          onClick={() => setSheet("region")}
          className={layout.mobilePickerButton}
        >
          <span className="truncate">{activeRegion.name}</span>
          <ChevronDown size={15} className="shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${t("traditionNav")}: ${activeTradition?.name ?? t("comingSoon")}`}
          onClick={() => setSheet("tradition")}
          className={layout.mobilePickerButton}
        >
          <span className="truncate">{activeTradition?.name ?? t("comingSoon")}</span>
          <ChevronDown size={15} className="shrink-0" aria-hidden />
        </button>
        {groups.length > 0 && (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`${t("groupNav")}: ${groupLabel}`}
            onClick={() => setSheet("group")}
            className={`${layout.mobilePickerButton} col-span-2`}
          >
            <span className="min-w-0 truncate">
              {groupLabel}
              {activeGroup && <span className="ms-1.5 text-xs font-medium text-text-tertiary">{activeGroup.personIds.length}</span>}
            </span>
            <ChevronDown size={15} className="shrink-0" aria-hidden />
          </button>
        )}
      </div>

      <BottomSheet isOpen={sheet === "region"} onClose={close} title={t("regionNav")}>
        <ul className="space-y-1 p-4">
          {regions.map((region) => {
            const selected = region.id === activeRegion.id;
            return (
              <li key={region.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChooseRegion(region.id);
                    close();
                  }}
                  className={`${FILTER_BOTTOMSHEET_STYLES.base} text-sm font-medium ${selected ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive}`}
                >
                  {region.name}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "tradition"} onClose={close} title={t("traditionNav")}>
        <ul className="space-y-1 p-4">
          {traditions.map((tradition) => {
            const selected = tradition.id === activeTradition?.id;
            const published = tradition.isPublished;
            return (
              <li key={tradition.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={published ? tradition.name : `${tradition.name} · ${t("comingSoon")}`}
                  onClick={() => {
                    if (!published) return onComingSoon(tradition.id);
                    onChooseTradition(tradition.id);
                    close();
                  }}
                  className={`${FILTER_BOTTOMSHEET_STYLES.base} justify-between text-sm font-medium ${selected ? FILTER_BOTTOMSHEET_STYLES.active : published ? FILTER_BOTTOMSHEET_STYLES.inactive : "cursor-not-allowed border-transparent text-white/35"}`}
                >
                  <span className="min-w-0 truncate text-start">{tradition.name}</span>
                  {/* 못 여는 신화는 눌렀을 때만 「작업 예정」을 잠깐 띄운다 — PC 칩 줄과 같은 규칙 */}
                  {comingSoonId === tradition.id && (
                    <span aria-hidden className="flex shrink-0 items-center gap-1 text-xs text-text-secondary">
                      <Clock3 size={13} aria-hidden />
                      {t("comingSoon")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet isOpen={sheet === "group"} onClose={close} title={t("groupNav")}>
        <ul className="space-y-1 p-4">
          <li>
            <button
              type="button"
              aria-pressed={!activeGroup}
              onClick={() => {
                onChooseGroup(null);
                close();
              }}
              className={`${FILTER_BOTTOMSHEET_STYLES.base} text-sm font-medium ${!activeGroup ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive}`}
            >
              {t("allGroups")}
            </button>
          </li>
          {groups.map((group) => {
            const selected = group.id === activeGroup?.id;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChooseGroup(group.id);
                    close();
                  }}
                  className={`${FILTER_BOTTOMSHEET_STYLES.base} justify-between text-sm font-medium ${selected ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive}`}
                >
                  <span className="min-w-0 truncate text-start">{groupName(group)}</span>
                  <span className="shrink-0 text-xs text-text-tertiary">{group.personIds.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
