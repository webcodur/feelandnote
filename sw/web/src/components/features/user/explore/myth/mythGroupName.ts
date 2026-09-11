import { MYTH_OTHER_GROUP_ID, type MythGroup } from "@/actions/home/mythAtlasTypes";

/* 그룹 탭·버튼·창에 보일 이름. 「그 외」 묶음과 영문 이름이 빈 묶음은 번역 문구로 채운다 —
   영문 화면에 한국어 묶음 이름을 그대로 내보내지 않는다(세력도감 쇼케이스와 같은 규칙) */
export function mythGroupName(group: MythGroup | null, labels: { other: string; unnamed: string }) {
  if (!group || group.id === MYTH_OTHER_GROUP_ID) return labels.other;
  return group.name ?? labels.unnamed;
}
