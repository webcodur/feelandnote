import type { MythPerson } from "@/actions/home/mythAtlasTypes";

/* 인물이 이 전승에서 거는 대표 사진. 같은 인물도 편마다 모습이 다르다 —
   일리아스의 아이아스는 트로이 전장에 서고, 오디세이아의 아이아스는 저승의 망령이다.
   1) 전승 전용 개인샷(백오피스 「신화 편집」 인물 줄의 사진 칸)
      다만 대사용 화보 첫 장을 그대로 옮겨 둔 개인샷은 건너뛴다 — 영상 출간 때 찍은 스틸이라
      그 뒤 사람이 갈아 끼운 인물 대표 사진보다 낡았다(일리아스·그리스 신화, 26.09.12 대조).
   2) 인물 대표 사진(portrait_url)
   아바타는 작은 얼굴 썸네일이라 여기서 대신하지 않는다 — 작은 칸에서만 부르는 쪽이 붙인다 */
export function mythLeadImage(person: MythPerson, traditionId: string): string | null {
  const here = person.appearances.find((item) => item.traditionId === traditionId);
  const themeShot = here?.imageUrl ?? null;
  const videoStill = here?.quoteMedia?.images[0]?.url ?? null;
  if (themeShot && themeShot !== videoStill) return themeShot;
  return person.portraitUrl ?? person.imageUrl ?? null;
}
