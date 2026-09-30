import type { FeaturedFaction } from "@/actions/home/getFeaturedFactions";
import { toSceneImages } from "@feelandnote/shared/lib/faction-team-image";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import { MYTH_OTHER_GROUP_ID, type MythData } from "@/actions/home/mythTypes";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";
import { buildFactionClusters, localizedFactionDescription, localizedFactionHeadline, localizedFactionName } from "./faction-sections";

/** 테마 그림만 등록한다. 과거 단체화보는 테마의 대표 이미지로 자동 승격하지 않는다. */
const THEME_ART: Record<string, string> = {
  "2000s-hollywood-action": "/images/factions/themes/2000s-hollywood-action-v2.webp",
  "80s-hollywood-action": "/images/factions/themes/80s-hollywood-action-v2.webp",
  "ai-new-wave": "/images/factions/themes/ai-new-wave-v3.webp",
  "ai-pioneers": "/images/factions/themes/ai-pioneers-v2.webp",
  "aircraft-makers": "/images/factions/themes/aircraft-makers-v3.webp",
  "american-literature-founders": "/images/factions/themes/american-literature-founders-v2.webp",
  "ancient-philosophers": "/images/factions/themes/ancient-philosophers-v3.webp",
  "anthropic": "/images/factions/themes/anthropic-v2.webp",
  "asset-management-empires": "/images/factions/themes/asset-management-empires-v2.webp",
  "autodidact": "/images/factions/themes/autodidact-v3.webp",
  "autonomous-driving": "/images/factions/themes/autonomous-driving-v2.webp",
  "beauty-creators": "/images/factions/themes/beauty-creators-v3.webp",
  "biotech": "/images/factions/themes/biotech-v2.webp",
  "capital-allocators": "/images/factions/themes/capital-allocators-v2.webp",
  "carthage": "/images/factions/themes/carthage-v2.webp",
  "chaebol-owners": "/images/factions/themes/chaebol-owners-v3.webp",
  "chinese-classical-literature": "/images/factions/themes/chinese-classical-literature-v2.webp",
  "chinese-empire": "/images/factions/themes/chinese-empire-v2.webp",
  "chinese-thought": "/images/factions/themes/chinese-thought-v2.webp",
  "christian-thought": "/images/factions/themes/christian-thought-v2.webp",
  "chungmuro": "/images/factions/themes/chungmuro-v3.webp",
  "classical-scholarship": "/images/factions/themes/classical-scholarship-v3.webp",
  "cold-war": "/images/factions/themes/cold-war-v2.webp",
  "comedy-creators": "/images/factions/themes/comedy-creators-v2.webp",
  "comics-masters": "/images/factions/themes/comics-masters-v2.webp",
  "community-platforms": "/images/factions/themes/community-platforms-v2.webp",
  "conquerors": "/images/factions/themes/conquerors-v2.webp",
  "console-wars": "/images/factions/themes/console-wars-v3.webp",
  "credit-and-central-banks": "/images/factions/themes/credit-and-central-banks-v2.webp",
  "cybersecurity": "/images/factions/themes/cybersecurity-v2.webp",
  "dawn-of-rome": "/images/factions/themes/dawn-of-rome-v2.webp",
  "defense-industry": "/images/factions/themes/defense-industry-v2.webp",
  "deprivation": "/images/factions/themes/deprivation-v2.webp",
  "digital-gold-rush": "/images/factions/themes/digital-gold-rush-v2.webp",
  "digital-resistance": "/images/factions/themes/digital-resistance-v2.webp",
  "discovery-of-evolution": "/images/factions/themes/discovery-of-evolution-v2.webp",
  "discovery-of-the-atom": "/images/factions/themes/discovery-of-the-atom-v3.webp",
  "drone-makers": "/images/factions/themes/drone-makers-v2.webp",
  "early-console-wars": "/images/factions/themes/early-console-wars-v2.webp",
  "east-asia-enlightenment": "/images/factions/themes/east-asia-enlightenment-v2.webp",
  "east-asian-buddhism": "/images/factions/themes/east-asian-buddhism-v3.webp",
  "energy-cartel": "/images/factions/themes/energy-cartel-v2.webp",
  "ev-and-battery": "/images/factions/themes/ev-and-battery-v2.webp",
  "exiles": "/images/factions/themes/exiles-v3.webp",
  "existentialists": "/images/factions/themes/existentialists-v3.webp",
  "fast-food-empire": "/images/factions/themes/fast-food-empire-v2.webp",
  "fighting-arts": "/images/factions/themes/fighting-arts-v2.webp",
  "film-directors": "/images/factions/themes/film-directors-v2.webp",
  "fin-de-si-cle-vienna": "/images/factions/themes/fin-de-si-cle-vienna-v2.webp",
  "football-managers": "/images/factions/themes/football-managers-v2.webp",
  "founding-monarchs": "/images/factions/themes/founding-monarchs-v3.webp",
  "french-empire": "/images/factions/themes/french-empire-v2.webp",
  "french-novelists": "/images/factions/themes/french-novelists-v2.webp",
  "game-empire": "/images/factions/themes/game-empire-v2.webp",
  "gaming-creators": "/images/factions/themes/gaming-creators-v3.webp",
  "genre-cinema": "/images/factions/themes/genre-cinema-v2.webp",
  "google-deepmind": "/images/factions/themes/google-deepmind-v3.webp",
  "great-hackers-faces": "/images/factions/themes/great-hackers-faces-v2.webp",
  "hip-hop-and-rnb": "/images/factions/themes/hip-hop-and-rnb-v2.webp",
  "hollywood-golden-age": "/images/factions/themes/hollywood-golden-age-v2.webp",
  "home-computer-wars": "/images/factions/themes/home-computer-wars-v2.webp",
  "hong-gildong-jeon": "/images/factions/themes/hong-gildong-jeon-v2.webp",
  "hong-kong-cinema": "/images/factions/themes/hong-kong-cinema-v2.webp",
  "humanoid-robotics": "/images/factions/themes/humanoid-robotics-v2.webp",
  "hundred-schools-of-thought": "/images/factions/themes/hundred-schools-of-thought-v2.webp",
  "hybe": "/images/factions/themes/hybe-v2.webp",
  "idol-group-current-female": "/images/factions/themes/idol-group-current-female-v2.webp",
  "idol-group-current-male": "/images/factions/themes/idol-group-current-male-v2.webp",
  "idol-group-former-female": "/images/factions/themes/idol-group-former-female-v3.webp",
  "idol-group-former-male": "/images/factions/themes/idol-group-former-male-v3.webp",
  "im-kkeokjeong": "/images/factions/themes/im-kkeokjeong-v3.webp",
  "immortality-seekers": "/images/factions/themes/immortality-seekers-v2.webp",
  "islamic-thought": "/images/factions/themes/islamic-thought-v2.webp",
  "jang-gilsan": "/images/factions/themes/jang-gilsan-v3.webp",
  "jazz-and-soul": "/images/factions/themes/jazz-and-soul-v2.webp",
  "joseon-dynasty": "/images/factions/themes/joseon-dynasty-v2.webp",
  "joseon-scholars": "/images/factions/themes/joseon-scholars-v2.webp",
  "jyp-entertainment": "/images/factions/themes/jyp-entertainment-v2.webp",
  "knowledge-youtubers": "/images/factions/themes/knowledge-youtubers-v4.webp",
  "korea-football-best11": "/images/factions/themes/korea-football-best11-v3.webp",
  "korea-sports-legends": "/images/factions/themes/korea-sports-legends-v2.webp",
  "korean-art": "/images/factions/themes/korean-art-v2.webp",
  "korean-cinema": "/images/factions/themes/korean-cinema-v2.webp",
  "korean-drama": "/images/factions/themes/korean-drama-v2.webp",
  "korean-literature": "/images/factions/themes/korean-literature-v2.webp",
  "late-han-warlords": "/images/factions/themes/late-han-warlords-v2.webp",
  "latin-music": "/images/factions/themes/latin-music-v2.webp",
  "left-and-right": "/images/factions/themes/left-and-right-v2.webp",
  "legendary-pirates": "/images/factions/themes/legendary-pirates-v2.webp",
  "lineage-of-mathematics": "/images/factions/themes/lineage-of-mathematics-v3.webp",
  "lineage-of-medicine": "/images/factions/themes/lineage-of-medicine-v2.webp",
  "literary-masters": "/images/factions/themes/literary-masters-v2.webp",
  "logistics-empire": "/images/factions/themes/logistics-empire-v2.webp",
  "lone-conquerors": "/images/factions/themes/lone-conquerors-v2.webp",
  "lord-of-the-rings": "/images/factions/themes/lord-of-the-rings-v2.webp",
  "luxury-empire": "/images/factions/themes/luxury-empire-v2.webp",
  "macedonian-empire": "/images/factions/themes/macedonian-empire-v2.webp",
  "maestro": "/images/factions/themes/maestro-v3.webp",
  "mafia": "/images/factions/themes/mafia-v2.webp",
  "magicians": "/images/factions/themes/magicians-v2.webp",
  "manhattan-project": "/images/factions/themes/manhattan-project-v2.webp",
  "masked-hackers": "/images/factions/themes/masked-hackers-v2.webp",
  "masters-of-painting": "/images/factions/themes/masters-of-painting-v2.webp",
  "mcu": "/images/factions/themes/mcu-v2.webp",
  "media-empires": "/images/factions/themes/media-empires-v2.webp",
  "messengers": "/images/factions/themes/messengers-v4.webp",
  "meta": "/images/factions/themes/meta-v3.webp",
  "method-acting": "/images/factions/themes/method-acting-v2.webp",
  "mlb": "/images/factions/themes/mlb-v2.webp",
  "modern-architects": "/images/factions/themes/modern-architects-v2.webp",
  "modern-management-thinkers": "/images/factions/themes/modern-management-thinkers-v3.webp",
  "modern-philosophers": "/images/factions/themes/modern-philosophers-v2.webp",
  "modern-poetry-pioneers": "/images/factions/themes/modern-poetry-pioneers-v3.webp",
  "mongol-empire": "/images/factions/themes/mongol-empire-v2.webp",
  "movie-star-era": "/images/factions/themes/movie-star-era-v2.webp",
  "music-streaming-wars": "/images/factions/themes/music-streaming-wars-v3.webp",
  "musk-inner-court": "/images/factions/themes/musk-inner-court-v3.webp",
  "nba": "/images/factions/themes/nba-v2.webp",
  "new-hollywood": "/images/factions/themes/new-hollywood-v4.webp",
  "new-space-age": "/images/factions/themes/new-space-age-v3.webp",
  "next-gen-energy": "/images/factions/themes/next-gen-energy-v2.webp",
  "nolan-troupe": "/images/factions/themes/nolan-troupe-v4.webp",
  "nonviolent-resistance": "/images/factions/themes/nonviolent-resistance-v2.webp",
  "openai": "/images/factions/themes/openai-v4.webp",
  "ottoman-empire": "/images/factions/themes/ottoman-empire-v2.webp",
  "payment-networks": "/images/factions/themes/payment-networks-v4.webp",
  "paypal-mafia": "/images/factions/themes/paypal-mafia-v3.webp",
  "pga-tour": "/images/factions/themes/pga-tour-v2.webp",
  "podcasters": "/images/factions/themes/podcasters-v2.webp",
  "pop-legends": "/images/factions/themes/pop-legends-v2.webp",
  "pop-stars-21c": "/images/factions/themes/pop-stars-21c-v3.webp",
  "qin-empire": "/images/factions/themes/qin-empire-v2.webp",
  "quant-empire": "/images/factions/themes/quant-empire-v3.webp",
  "quantum-computing": "/images/factions/themes/quantum-computing-v2.webp",
  "readers-on-the-throne": "/images/factions/themes/readers-on-the-throne-v2.webp",
  "renaissance-maestros": "/images/factions/themes/renaissance-maestros-v3.webp",
  "retail-and-commerce": "/images/factions/themes/retail-and-commerce-v2.webp",
  "revolutionaries": "/images/factions/themes/revolutionaries-v3.webp",
  "road-to-space": "/images/factions/themes/road-to-space-v2.webp",
  "rock-legends": "/images/factions/themes/rock-legends-v2.webp",
  "roman-emperors": "/images/factions/themes/roman-emperors-v2.webp",
  "romantic-comedy": "/images/factions/themes/romantic-comedy-v3.webp",
  "romantic-music": "/images/factions/themes/romantic-music-v3.webp",
  "romes-adversaries": "/images/factions/themes/romes-adversaries-v2.webp",
  "self-made": "/images/factions/themes/self-made-v3.webp",
  "sengoku-warlords": "/images/factions/themes/sengoku-warlords-v2.webp",
  "shakespeare-stage-actors": "/images/factions/themes/shakespeare-stage-actors-v2.webp",
  "sharing-economy": "/images/factions/themes/sharing-economy-v4.webp",
  "silicon-empire": "/images/factions/themes/silicon-empire-v2.webp",
  "sm-entertainment": "/images/factions/themes/sm-entertainment-v3.webp",
  "social-media": "/images/factions/themes/social-media-v3.webp",
  "south-korean-presidents": "/images/factions/themes/south-korean-presidents-v2.webp",
  "spacex": "/images/factions/themes/spacex-v2.webp",
  "special-forces": "/images/factions/themes/special-forces-v2.webp",
  "sports-empire": "/images/factions/themes/sports-empire-v4.webp",
  "spymasters": "/images/factions/themes/spymasters-v3.webp",
  "state-hackers": "/images/factions/themes/state-hackers-v2.webp",
  "stock-exchanges": "/images/factions/themes/stock-exchanges-v2.webp",
  "streaming-empire": "/images/factions/themes/streaming-empire-v3.webp",
  "street-fashion": "/images/factions/themes/street-fashion-v2.webp",
  "tarantino-troupe": "/images/factions/themes/tarantino-troupe-v2.webp",
  "tesla": "/images/factions/themes/tesla-v2.webp",
  "the-chu-han-contention": "/images/factions/themes/the-chu-han-contention-v3.webp",
  "the-founding-fathers": "/images/factions/themes/the-founding-fathers-v2.webp",
  "the-french-revolution": "/images/factions/themes/the-french-revolution-v2.webp",
  "the-lost-generation": "/images/factions/themes/the-lost-generation-v2.webp",
  "the-singularity-is-near": "/images/factions/themes/the-singularity-is-near-v2.webp",
  "thiel-universe": "/images/factions/themes/thiel-universe-v3.webp",
  "thinking-machines": "/images/factions/themes/thinking-machines-v2.webp",
  "three-kingdoms": "/images/factions/themes/three-kingdoms-v2.webp",
  "trump-dynasty": "/images/factions/themes/trump-dynasty-v2.webp",
  "us-presidents": "/images/factions/themes/us-presidents-v3.webp",
  "vlog": "/images/factions/themes/vlog-v2.webp",
  "wall-street": "/images/factions/themes/wall-street-v2.webp",
  "warring-states": "/images/factions/themes/warring-states-v2.webp",
  "wild-west": "/images/factions/themes/wild-west-v2.webp",
  "world-cup-2026": "/images/factions/themes/world-cup-2026-v2.webp",
  "world-football-best11": "/images/factions/themes/world-football-best11-v2.webp",
  "ww2-asia-pacific": "/images/factions/themes/ww2-asia-pacific-v2.webp",
  "ww2-axis-europe": "/images/factions/themes/ww2-axis-europe-v2.webp",
  "ww2-britain-free-france": "/images/factions/themes/ww2-britain-free-france-v2.webp",
  "ww2-soviet-union": "/images/factions/themes/ww2-soviet-union-v2.webp",
  "ww2-united-states": "/images/factions/themes/ww2-united-states-v2.webp",
  "x-men": "/images/factions/themes/x-men-v2.webp",
  "x-platform": "/images/factions/themes/x-platform-v2.webp",
  "xai": "/images/factions/themes/xai-v2.webp",
  "yg-theblacklabel": "/images/factions/themes/yg-theblacklabel-v2.webp",
  "youtube-stars": "/images/factions/themes/youtube-stars-v4.webp",
};

export function getFactionThemeImage(slug: string | null): string | undefined {
  return slug ? THEME_ART[slug] : undefined;
}

/* 「이 세력의 책」— 세력 자체를 주인공으로 다루는 작품의 content_id 명단. 신화 선반의
   MYTH_OWN_WORK_IDS(MythWorkShelf)와 같은 장치다. 구성원이 겹치는 책과 세력이 주인공인 책은
   인물 그래프로 가를 수 없어 세력마다 명시한다. 작품 선반은 이 목록을 앞 구간으로 세우고
   그 뒤에 구성원 등장 작품을 붙인다. */
export const FACTION_OWN_WORK_IDS: Record<string, string[]> = {
  openai: [
    "fe895343-eb8d-450f-b2e2-e5f8655f38cd", // AI 제국: 권력, 자본, 노동 — 카렌 하오의 오픈AI사
    "3d495203-e787-4de0-8037-b5568c4d468c", // 패권 — 파미 올슨의 오픈AI·딥마인드 대립사
  ],
  "google-deepmind": [
    "2cecb7f7-110f-565e-84ac-47c821492f9e", // AI 메이커스 — 딥마인드 창립이 핵심 축
    "3d495203-e787-4de0-8037-b5568c4d468c", // 패권 — 딥마인드 쪽 주인공이 데미스 허사비스
    "c61f3867-d5b3-524a-9b66-cfb958488b8a", // 알파고 VS 이세돌 — 알파고가 딥마인드의 작품
  ],
  anthropic: [
    "92b6679c-3f24-5660-826f-2cad856cb3d3", // 클로드의 탄생: 앤트로픽과 AI 안전 혁명
    "34e68960-9f08-5c34-9f36-fb9e00a13bd3", // 앤트로픽 Claude
    "a07cb9e0-4d5b-53ab-8f23-6428e539df34", // Dario Amodei 앤쓰로픽, 클로드
  ],
  meta: [
    "ee28cdf8-9598-5a3b-ae64-19bbecf3b094", // 페이스북 이펙트 — 데이비드 커크패트릭의 페이스북사
    "1e5734d5-81d8-5d69-aa5d-7418020ff9b2", // 비커밍 페이스북 — 회사 성장 내부사
    "cdd6f029-c9ee-4537-b283-aef25f191414", // 마크 저커버그의 배신 — 로저 맥나미의 페이스북 비판사
    "19ddf5f5-5f3f-4a99-b98a-f9f3ab635e7e", // 노 필터 — 인스타그램 내부사(페이스북 인수 이후 포함)
  ],
  "ai-pioneers": [
    "e2b67d52-b6ae-5485-9f00-2a9598ba1d90", // AI의 역사 — 토비 월시의 AI 전사(튜링·다트머스~트랜스포머)
    "a3b271e3-595f-5d2b-9b9b-3da02aabfb06", // AI와 40인의 괴짜들 — 튜링에서 GPT까지 70년 인물사
    "book-9791185890418", // 인공지능: 현대적 접근방식 — 러셀·노빅의 표준 원전
    "3f7147b1-9b09-4bc0-a2fc-15586345cf8b", // 심층 학습 — 이안 굿펠로의 딥러닝 원전
  ],
  "ai-new-wave": [
    "f82aa835-9a9d-594e-a5df-6f6b3cfaa2e5", // AI 혁명을 이끈 천재들 — 신세대 혁신가 10인 열전
    "2cecb7f7-110f-565e-84ac-47c821492f9e", // AI 메이커스 — 딥러닝 세대의 통사
    "7827180e-dfc9-509d-bba6-9346a0f844bd", // 트랜스포머를 활용한 자연어 처리 — 허깅페이스 창립 연구진 저서
    "287c367d-42a3-504a-93a5-2ed18104dbe2", // 딥시크 딥쇼크 — 딥시크 충격 분석서
  ],
  "renaissance-maestros": [
    "bd5e9549-efaf-4324-ac52-9ecd1a6e3bf7", // 이탈리아 르네상스의 문화 — 부르크하르트의 고전
  ],
  "korean-cinema": [
    "87d16d69-0ffd-51fc-b76d-8ce15ba972db", // 데뷔의 순간 — 한국영화감독조합 기획
  ],
  chungmuro: [
    "2283afea-a02a-5154-a10f-36a4e7d42158", // 한국영화 배우사전
  ],
  "fin-de-si-cle-vienna": [
    "8abc753f-6363-544f-bbef-8977fab52b53", // 세기말 빈 — 칼 쇼르스케
    "08238ac7-5ec3-5e45-9a29-b18f8c08b7ce", // 어제의 세계 — 슈테판 츠바이크
  ],
  "the-lost-generation": [
    "dc024bd3-8ad2-4d51-9e1c-2fb7b0e77eb9", // 파리는 날마다 축제 — 헤밍웨이의 잃어버린 세대 회고록
    "cd52064e-6bab-5a8c-9261-4920c914ba21", // 앨리스 B 토클라스 자서전 — 스타인 살롱의 증언
  ],
  mcu: [
    "aa95f7d7-f4ad-5fd9-84d9-46383562c384", // MCU: 마블 인사이드
  ],
  "quant-empire": [
    "e84164c1-f657-5156-af8b-a2ed876c5197", // 퀀트 — 스캇 패터슨의 퀀트 트레이딩사
  ],
  "thiel-universe": [
    "bc00b0d6-6b3c-59b0-b03c-69a2d6f468d7", // 저글러, 땜장이, 놀이꾼 — 페이팔 창업사, 틸 유니버스 형성 원전
  ],
  "paypal-mafia": [
    "bc00b0d6-6b3c-59b0-b03c-69a2d6f468d7", // 저글러, 땜장이, 놀이꾼 — 페이팔 마피아 결성사
  ],
  "x-platform": [
    "b52e90da-0986-42ce-83c3-c137947762de", // 해칭 트위터 — 닉 빌턴의 트위터 창업사
  ],
  maestro: [
    "8e7ee01f-93cd-4bef-bb76-3a5e41e992ec", // 거장 신화 — 노먼 레브레히트의 지휘자 군상사
  ],
  "roman-emperors": [
    "1de51489-f9aa-518a-b0b8-055a1bb36409", // 풍속으로 본 12인의 로마황제 2 — 수에토니우스 원전
    "a8eadd57-067a-59bf-9db6-fb2f51bff190", // 로마제국 쇠망사 4 — 기번
    "f1d5d4ea-fcec-53e2-8aa6-6b69e54aaf4e", // 로마인 이야기 6: 팍스 로마나 — 시오노 나나미
    "f5477f4d-1b0f-5711-9218-6d066b3ac6d9", // 로마인 이야기 7: 악명높은 황제들 — 시오노 나나미
    "358e37a1-4f00-557d-a856-55e667757f4e", // 그들은 로마를 만들었고, 로마는 역사가 되었다
  ],
  "warring-states": [
    "c2c62284-e8d3-443a-afb0-6a9c4b27c267", // 사기본기 — 사마천 원전
    "cdb91aa0-63e0-5bcc-8745-c290850e1438", // 사기 — 사마천
    "bc60beee-bf16-43bb-8970-2de19f4b1153", // 전국책 — 유향
    "a8412726-2296-5ed9-89a3-3076c7cf5035", // 전국책 1-2권 세트 — 유향
    "c0074450-5a41-53b5-9aa4-31da21dc5571", // 전국시대 이야기 상 — 조면희
    "d77ef0bc-fe5e-585b-97b9-925dd13c736b", // 사기의 숲에서 사람을 배우다 — 신동준
    "4c885396-aa0c-502b-9997-d6896519815e", // 만화로 읽는 사마천의 사기 3: 전국 칠웅
  ],
  "the-french-revolution": [
    "c1a865d0-b2c1-4e06-b418-83145e4b674d", // 프랑스혁명에 관한 성찰 — 에드먼드 버크
  ],
  "three-kingdoms": [
    "0b01c043-879c-4b7a-a9b8-7ec2b439056b", // 삼국지연의 — 나관중 원작
    "baa7f994-40d1-44c4-b855-260ea978d021", // 정사 삼국지 — 진수
    "c1a0dbaf-1f2c-5957-aa08-9c693d6ca471", // 정사 삼국지(위서 2) — 진수
    "c6cc3246-a71c-529a-8c5a-ae85057794f7", // 정사 삼국지(오서) — 진수
    "561f07f4-700f-5e8b-9232-c8faeeceb7e0", // 청소년 삼국지 2 — 나관중 각색
    "7ea04905-3703-58b0-b488-b60cbf822139", // 인물 삼국지 — 이나미 리츠코
    "cf2b0e63-e6d5-5d56-b93a-cf9e55ab4133", // 삼국지 인물 108인전 — 최용현
    "fffb6811-c3e4-5fc3-b9b7-b015ab294617", // 삼국지 장군 34선 — 와타나베 요시히로
    "3433d3c6-a115-54c1-bb98-03e4daf90e27", // 삼국지의 책사들 — 나채훈
  ],
  "macedonian-empire": [
    "534e4f48-0077-5e28-9aeb-b630843a99f3", // 알렉산드로스 대왕 원정기 — 아리아노스 원전
    "b33033c3-371c-5a8e-8395-57123b64e7ac", // 알렉산드로스 제국의 눈물 — 제임스 롬
    "3ccae4bc-9bf5-5a17-b7f1-8e3ce1d0282a", // 필리포스와 알렉산드로스 — 골즈워디
  ],
  "manhattan-project": [
    "c0fdee67-dbc1-443a-aa22-ac1c337046b9", // 아메리칸 프로메테우스 — 오펜하이머를 축으로 한 프로젝트사
  ],
  "qin-empire": [
    "ecab3868-1114-51e6-a28e-d22f0c15b948", // 사마천의 사기 속의 진시황
    "c2c62284-e8d3-443a-afb0-6a9c4b27c267", // 사기본기 — 사마천
    "aec8a9f0-6459-5de5-bca2-5019baaed74a", // 진시황 강의 — 왕리췬
    "9ad87518-782f-5339-baef-e6a3621c98d2", // 천하통일 — 강철근
  ],
  "the-chu-han-contention": [
    "c2c62284-e8d3-443a-afb0-6a9c4b27c267", // 사기본기 — 사마천 원전
    "ecab3868-1114-51e6-a28e-d22f0c15b948", // 사마천의 사기 속의 진시황
    "572f5f0a-bf55-5a36-904b-ea1214a4d4d9", // 초한지 강의 — 이중톈
    "20d269b3-cc1d-5c15-8b00-2623644254d9", // 교양으로 읽는 초한지 — 견위
    "c43b42e1-9e18-5354-a326-37413b869542", // 초한지3 — 종산거사 견위
    "437690e4-1067-5585-986f-8dbb9dea309a", // 청소년을 위한 초한지 — 이상인
    "341d3562-29e6-5d25-a7a0-089fba69d1e0", // 현대인의 초한지 인문학 — 염철현
  ],
  "ottoman-empire": [
    "d5b4d3ef-a84b-5bd4-a5f2-2ee8327331d1", // 오스만 제국 — 오가사와라 히로유키
    "101ba6f6-4b98-5dd4-b995-cddb6cc936d6", // 1453 콘스탄티노플 최후의 날 — 런치만
    "36a1892c-9b13-5c36-8aa1-87868a5b6559", // 비잔티움 제국 최후의 날 — 로저 크롤리
    "8635a671-8acd-5e94-b669-e520789a75e6", // 전쟁 1(콘스탄티노플함락) — 시오노 나나미
  ],
  "silla-dynasty": [
    "467d387e-c688-43b0-8570-01df791de22b", // 원본 삼국사기 — 김부식
    "79334378-a390-40bb-9dd9-025c41eed94f", // 삼국유사 — 일연
  ],
  "trump-dynasty": [
    "17618b6c-d3c6-5322-9dff-c1983cbb7c7d", // 화염과 분노 — 마이클 울프의 백악관 내부사
  ],
  "french-empire": [
    "b9bdf56c-47bd-5f95-b020-1130014750cf", // 나폴레옹 전쟁
    "31346210-1bab-5147-9aa5-7f1e1e5b7a12", // 나폴레옹 — 프랭크 매클린
  ],
  "us-presidents": [
    "6d66c8a3-9e3e-5d3c-977f-bdd8a0043768", // 대통령의 리더십 — 마이클 베슐로스
    "0811d3e3-5626-5381-b941-37c4872b6190", // 혼돈의 시대 리더의 탄생 — 도리스 컨스 굿윈
  ],
  "chinese-empire": [
    "502b3c5e-d84b-5a68-bb5f-b655b49da530", // 중국사 인물 열전 — 소준섭
  ],
  "legendary-pirates": [
    "e3010977-2e8c-5fa8-98c6-e31caca03260", // 해적의 역사 — 대니얼 디포
    "4e441879-a1a9-5213-b6cd-5979b627e8a8", // 해적의 역사 — 앵거스 컨스텀
    "6d7ee10c-3073-51d5-aa1c-80fad9e7db5d", // 너무 재밌어서 잠 못 드는 해적의 세계사
    "26a055a4-7cd0-5540-8874-b2497f02951d", // 단숨에 읽는 해적의 역사
  ],
  "mongol-empire": [
    "703f58f6-3499-4210-b048-13b7f7eef659", // 몽골 비사 — 원전
    "31a294db-c84f-5009-bf43-f7c255d681c8", // 부족지 — 라시드 앗 딘 원전
    "ec1ac17b-2a9a-41b4-b987-4b6086bfbeb2", // 몽골제국과 세계사의 탄생 — 김호동
    "63557ba7-51c8-47a3-9ba5-2e49900b14e7", // 칭기스칸 잠든 유럽을 깨우다 — 잭 웨더포드
    "f5ff6a47-0444-59af-a6f0-af83de755c50", // 원나라 역대 황제 평전 — 강정만
  ],
  "joseon-dynasty": [
    "fdd72e9c-f4c0-5b08-838e-b0d5af810ecd", // 조선왕조실록 1: 태조 — 이덕일
  ],
  "late-han-warlords": [
    "0b01c043-879c-4b7a-a9b8-7ec2b439056b", // 삼국지연의 — 나관중
    "baa7f994-40d1-44c4-b855-260ea978d021", // 정사 삼국지 — 진수
  ],
  "dawn-of-rome": [
    "f1d5d4ea-fcec-53e2-8aa6-6b69e54aaf4e", // 로마인 이야기 6: 팍스 로마나 — 시오노 나나미
  ],
  "ww2-axis-europe": [
    "23c5772b-2dd1-5098-b882-e53a454d055f", // 독일 국방군: 제2차 세계대전 독일군의 신화와 진실
    "2e7cc94b-905a-5679-817c-d6b24996fa50", // 히틀러의 장군들 — 남도현
    "7b7c0107-ecf3-5a5d-b0e8-3afb991a48d4", // 전격전의 전설 — 칼 하인츠 프리저
  ],
  "ww2-soviet-union": [
    "d382ff0e-eed7-5d81-8ee1-5f4fd4e934ac", // 독소 전쟁사 1941 ~ 1945 — 글랜츠·하우스
  ],
  "the-founding-fathers": [
    "68275cad-d64b-5060-b72c-50a143fafcc2", // 연방주의자 논집 — 건국 원전
    "780642f5-e295-5957-ac27-ced36e2f0987", // 미합중국 건국의 아버지들
  ],
  spymasters: [
    "651083e0-fb5f-5481-89ab-3c5199317c9f", // 모사드 — 바르조하르·미샬의 공식사
  ],
  "masked-hackers": [
    "94f7b007-ae4f-5bce-bc46-564aea52ba07", // 우리가 어나니머스다 — 파미 올슨의 내부 실록
  ],
  mafia: [
    "f986936d-3408-5081-a06b-600caf2299d0", // 마피아 3 — 안혁
    "57187093-7f34-55bd-a747-a028ec1d5436", // 마피아 5 — 안혁
    "ecbef2eb-47e8-57d7-9c92-1fcd09d01606", // 갱과 마피아 — 콜린 윌슨
  ],
  cybersecurity: [
    "fe2ff01f-5137-5b60-8a52-ed3a8eb2e7c5", // Hacking Exposed 7 — 업계 표준 원전
  ],
  "state-hackers": [
    "7664f857-51d4-4728-bc82-b99c61273dcb", // 샌드웜 — 앤디 그린버그의 국가 해킹 추적
  ],
  "world-football-best11": [
    "c5512b06-0d3d-584b-a896-db07f30b0c1e", // 발롱도르: 세계 축구의 전설들 — 프랑스풋볼 공식 도감
  ],
  tesla: [
    "323f7a03-2a98-5e19-bc2a-f624c36b908f", // 테슬라 모터스 — 찰스 모리스 회사사
    "bebdefca-6023-46bc-84dc-08c61af7849f", // 일론 머스크, 미래의 설계자 — 테슬라·스페이스X 창업 서사
  ],
  "bell-labs": [
    "a4be7940-f8b3-5479-88b6-48f56afdecc6", // 아이디어 팩토리 — 존 거트너의 벨 연구소사
  ],
  "autonomous-driving": [
    "a4c04428-5110-5525-9ac2-4284f35be7e8", // 오토노미 제2의 이동 혁명 — 번스·슐건
  ],
  "console-wars": [
    "db2a297d-f815-5de0-b05f-722907176a24", // 콘솔 워즈 — 세가 vs 닌텐도 원전
    "4db94d5a-9ab2-5453-afad-2e4dca9c8668", // 게임왕국 일본을 건설한 거인들
  ],
  "early-console-wars": [
    "db2a297d-f815-5de0-b05f-722907176a24", // 콘솔 워즈 — 초창기 콘솔 전쟁 원전
    "4db94d5a-9ab2-5453-afad-2e4dca9c8668", // 게임왕국 일본을 건설한 거인들
  ],
  spacex: [
    "50a1efe3-4af7-5a4e-9726-78cad7625168", // 리프트오프 — 에릭 버거의 스페이스X 초기사
    "e0170dfb-393b-5a8a-a9ce-e974c19c6a8a", // 스페이스X 우주혁명이 온다 — 권군오
  ],
  "aircraft-makers": [
    "73dfa067-94ff-4657-9c2c-1f1727bdb480", // 스컹크 웍스 — 벤 리치의 록히드 개발 내부사
  ],
  "silicon-empire": [
    "62bc8016-c3d8-47e8-a581-e70bd0caed0e", // 칩워 — 크리스 밀러의 반도체 패권사
    "1c2bbc94-04d1-44fc-ab68-37215cb0257e", // 인텔: 끝나지 않은 도전과 혁신 — 마이클 말론
  ],
  "quantum-computing": [
    "12f0daaa-ae09-5a02-ae02-40728dadb363", // 양자컴퓨팅 혁명
  ],
  "road-to-space": [
    "0687350e-e634-541c-90d6-f5d4c35a56bd", // 달에 처음으로 — 아폴로 11호 승무원 공저
  ],
  "the-singularity-is-near": [
    "fd11b285-085b-4626-9e66-7efcd9241a6f", // 특이점이 온다 — 커즈와일 원전
    "16a85cff-b0e7-4e34-abb7-ac0aefa6a44b", // 슈퍼인텔리전스 — 닉 보스트롬
  ],
  "christian-thought": [
    "54b2c31d-04b0-5246-8a91-e5dfad1cd497", // 세계교회사. 1: 고대 및 중세편 — 케이른즈
  ],
  existentialists: [
    "fc6171de-ea76-584c-b8e6-143a41a08b2e", // 실존주의란 무엇인가 — 시몬 드 보부아르
  ],
};

export interface FactionThemeGroup {
  name: string;
  description: string | null;
  description_en: string | null;
}

/** 현재 테마 한 개만 공용 탐색판에 전달한다. 다른 테마는 기존의 정식 주소로 이동한다. */
export function toFactionThemeData(entry: FeaturedFaction, celebs: CelebProfile[], groupRows: FactionThemeGroup[], books: FactionFigureBook[], locale: Locale): MythData {
  const isEn = locale === "en";
  const byId = new Map(celebs.map((person) => [person.id, person]));
  const members = entry.celebs.filter((member) => byId.has(member.id));
  const personIds = members.map((member) => member.id);
  const descriptions = new Map(groupRows.map((group) => [group.name, (isEn ? group.description_en : group.description)?.trim() || null]));
  const clusters = buildFactionClusters(members, locale);
  const slug = entry.slug ?? entry.id;
  const image = getFactionThemeImage(slug);
  const theme = {
    id: entry.id, slug, name: localizedFactionName(entry, locale),
    headline: localizedFactionHeadline(entry, locale),
    description: localizedFactionDescription(entry, locale),
    isPublished: true, regionId: "faction", music: entry.music,
    images: [...(image ? [{ url: image, label: null }] : []), ...toSceneImages(entry.team_images, locale)],
    personIds, leadPersonIds: [],
    groups: clusters.length > 1 ? clusters.map((cluster) => ({
      id: cluster.name ?? MYTH_OTHER_GROUP_ID, name: cluster.label,
      description: cluster.name ? descriptions.get(cluster.name) ?? null : null,
      personIds: cluster.celebIds,
    })) : [],
  };
  return {
    regions: [{ id: "faction", slug: "faction", name: theme.name, mythIds: [entry.id] }],
    myths: [theme],
    people: members.map((member) => {
      const person = byId.get(member.id)!;
      const summary = (isEn ? member.short_desc_en : member.short_desc)?.trim() || null;
      return {
        id: person.id, slug: person.slug ?? person.id,
        name: isEn ? person.nickname_en || person.nickname : person.nickname,
        reality: person.celeb_reality,
        title: isEn ? person.title_en || person.title : person.title,
        headline: null, bio: isEn ? person.bio_en : person.bio, reading: null, summary,
        voiceV: person.voice_v ?? 0,
        appearances: [{ mythId: entry.id, summary, imageUrl: member.faction_image_url }],
        avatarUrl: person.avatar_url, imageUrl: null, portraitUrl: member.portrait_url ?? null, images: [],
        mythIds: [entry.id], sourceIds: books.filter((book) => book.memberIds.includes(person.id)).map((book) => book.contentId),
      };
    }),
    works: books.map((book) => ({
      id: book.contentId, editionId: book.editionId,
      title: book.title, titleBadge: book.titleBadge ?? null,
      creator: book.creator ?? null, thumbnailUrl: book.thumbnail ?? null,
      category: "book", coupangUrl: isEn ? null : book.url || null,
      personIds: book.memberIds, appearedIds: book.appearedIds, authorIds: book.authoredIds,
    })),
  };
}
