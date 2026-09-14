/** 개발자 모형의 실제 상품과 조사 근거. 운영 상품/제휴 DB로 사용하지 않는다. */
export const PROTOTYPE_CHECKED_AT = "2026-09-14";
export type JourneyId = "low-end-theory" | "breath-of-the-wild" | "wheat-field";
export interface JourneyWork {
  id: JourneyId;
  title: string;
  creator: string;
  kind: "music" | "game" | "art";
  image: string;
  eyebrow: string;
  headline: string;
  story: string;
  action: string;
  source: { label: string; url: string };
  experience: { label: string; url: string };
  preview?: { title: string; url: string; source: string };
}

export const JOURNEY_WORKS: Record<JourneyId, JourneyWork> = {
  "low-end-theory": {
    id: "low-end-theory", kind: "music", title: "The Low End Theory", creator: "A Tribe Called Quest",
    image: "https://image.yes24.com/goods/129990621/XL",
    eyebrow: "듣고 싶은 앨범에서, 갖고 싶은 음반으로",
    headline: "이 음악을 내 방에서도.",
    story: "베이스와 드럼 위로 두 래퍼의 목소리가 오갑니다. 먼저 ‘Check the Rhime’을 들어보고, 앨범을 처음부터 끝까지 이어 들어보세요.",
    action: "음반 형태 고르기",
    source: { label: "Apple Music 앨범 소개", url: "https://music.apple.com/us/album/the-low-end-theory/278911460" },
    experience: { label: "Apple Music에서 듣기", url: "https://music.apple.com/us/album/the-low-end-theory/278911460" },
    preview: {
      title: "Check the Rhime",
      url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b6/d9/ff/b6d9ff32-4a23-b512-326c-859dd0d36731/mzaf_5796514024984352966.plus.aac.p.m4a",
      source: "https://itunes.apple.com/lookup?id=278911460&entity=song&country=US",
    },
  },
  "breath-of-the-wild": {
    id: "breath-of-the-wild", kind: "game", title: "젤다의 전설 브레스 오브 더 와일드", creator: "Nintendo",
    image: "https://thumbnail.coupangcdn.com/thumbnails/remote/640x640ex/image/vendor_inventory/49e5/9daef75e47252c4391174691f366443b9710f5ad08fdcd7fd1e8267c4545.jpg",
    eyebrow: "보고 있던 세계를 직접 탐험하기",
    headline: "어디로 갈지는 내가 정한다.",
    story: "산을 오르고, 바람을 타고, 멀리 보이는 곳으로 향합니다. 이 세계를 직접 탐험하고 싶다면, 가지고 있는 게임기에 맞는 버전부터 골라보세요.",
    action: "내 게임기에 맞춰 고르기",
    source: { label: "닌텐도 공식 구입 가이드", url: "https://www.nintendo.com/kr/games/zelda/botw/edition/guide/" },
    experience: { label: "어떤 게임인지 보기", url: "https://www.nintendo.com/kr/software/feature/zelda/" },
  },
  "wheat-field": {
    id: "wheat-field", kind: "art", title: "사이프러스 나무가 있는 밀밭", creator: "빈센트 반 고흐",
    image: "https://customprints.metmuseum.org/vitruvius/render/700/489070.jpg",
    eyebrow: "마음에 든 그림 한 점을 내 공간에",
    headline: "오래 보고 싶은 풍경.",
    story: "고흐가 1889년 생레미에서 그린 밀밭입니다. 같은 구도의 다른 버전과 구별해, 여기서는 메트로폴리탄 미술관 소장 작품의 복제 프린트를 살펴봅니다.",
    action: "프린트 크기와 소재 고르기",
    source: { label: "The Met 작품·상품 설명", url: "https://customprints.metmuseum.org/detail/489070/van-gogh-wheat-field-with-cypresses" },
    experience: { label: "미술관에서 작품 알아보기", url: "https://customprints.metmuseum.org/detail/489070/van-gogh-wheat-field-with-cypresses" },
  },
};

export interface JourneyTarget { title: string; creator?: string | null; type: string; contentId?: string }
const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** 제목만 같은 다른 아티스트/속편/확장판을 상품으로 오연결하지 않는다. */
export function findJourney(target: JourneyTarget): JourneyId | null {
  const title = normalize(target.title);
  const creator = normalize(target.creator ?? "");
  if (target.type === "MUSIC"
    && ["thelowendtheory", "lowendtheory"].includes(title)
    && ["atribecalledquest", "어트라이브콜드퀘스트"].includes(creator)) return "low-end-theory";
  if (target.type === "GAME"
    && ["젤다의전설브레스오브더와일드", "젤다의전설야생의숨결", "thelegendofzeldabreathofthewild"].includes(title)
    && ["nintendo", "닌텐도", "nintendoepd", "닌텐도epd", "nintendoentertainmentplanningdevelopment"].includes(creator)) return "breath-of-the-wild";
  // 그림은 같은 제목의 원작이 여러 점이다. 명확한 작품 ID가 없는 자동 연결은 하지 않는다.
  return null;
}
