// 완결 여부는 faction_lv2.scenes_complete가 쥔다. 해당 언어의 공개 장면이 있어야 표시한다.
export function hasCompletedFactionScenes(complete: boolean | null | undefined, sceneCount: number): boolean {
  return complete === true && sceneCount > 0;
}
