/*
  파일명: /lib/celeb/world.ts
  기능: 인물이 살았던 '세계' 판정
  책임: 국적과 연도만으로 인물을 세계 하나에 배정한다.
        DB·네트워크·브라우저 API를 쓰지 않는 순수 함수다.

  설계 원칙
  - 지역 축과 시대 축을 교차시키지 않는다. 세계는 하나짜리 목록이며 인물은 그중 하나에 속한다.
    교차 방식은 고구려와 춘추전국, 조선과 몽골, 조선과 전국시대 일본을 같은 칸에 넣어 못 쓴다.
  - 연도를 모르면 근현대로 밀지 않는다. 삼국지 장수처럼 연도 없는 옛 인물이 현대 배경을 받기 때문이다.
    생몰 어느 쪽도 없으면 중립 세계로 떨어진다.
  - 규칙으로 안 잡히는 인물은 나중에 손으로 지정한다(override).
*/

export interface CelebWorld {
  id: string;
  /** 실험실·관리 화면에서만 쓰는 이름. 서비스 화면에는 글자로 나오지 않는다 */
  label: string;
}

export const CELEB_WORLDS: readonly CelebWorld[] = [
  { id: "three-kingdoms-korea", label: "삼국·고구려" },
  { id: "goryeo", label: "통일신라·고려" },
  { id: "joseon", label: "조선" },
  { id: "modern-korea", label: "근현대 한국" },
  { id: "warring-states-china", label: "춘추전국" },
  { id: "han-china", label: "진한·위진" },
  { id: "tang-song", label: "수당송" },
  { id: "ming-qing", label: "원명청" },
  { id: "modern-china", label: "근현대 중국" },
  { id: "ancient-japan", label: "고대 일본" },
  { id: "samurai-japan", label: "무사시대 일본" },
  { id: "edo", label: "에도" },
  { id: "modern-japan", label: "근현대 일본" },
  { id: "steppe", label: "초원 유목" },
  { id: "ancient-greece", label: "고대 그리스" },
  { id: "rome", label: "로마" },
  { id: "ancient-india", label: "고대 인도" },
  { id: "mughal", label: "무굴" },
  { id: "modern-india", label: "근현대 인도" },
  { id: "ancient-near-east", label: "고대 근동" },
  { id: "islamic-golden-age", label: "이슬람 황금기" },
  { id: "ottoman-persia", label: "오스만·페르시아" },
  { id: "modern-middle-east", label: "근현대 중동" },
  { id: "medieval-rus", label: "중세 루스" },
  { id: "imperial-russia", label: "제정 러시아" },
  { id: "soviet-east-europe", label: "소비에트·현대 동유럽" },
  { id: "colonial-america", label: "식민·건국 미국" },
  { id: "frontier-america", label: "개척기 미국" },
  { id: "modern-america", label: "현대 미국" },
  { id: "medieval-europe", label: "중세 유럽" },
  { id: "renaissance", label: "르네상스" },
  { id: "age-of-sail", label: "대항해·절대왕정" },
  { id: "industrial-europe", label: "산업혁명 유럽" },
  { id: "world-wars", label: "20세기 전쟁기" },
  { id: "modern-west", label: "현대 서구" },
  { id: "latin-america", label: "라틴아메리카" },
  { id: "africa", label: "아프리카" },
  { id: "myth", label: "신화" },
  { id: "neutral", label: "중립(연도 미상)" },
] as const;

const WORLD_IDS = new Set(CELEB_WORLDS.map((world) => world.id));

const CHINA = ["CN", "TW", "HK"];
const SOUTH_ASIA = ["IN", "PK", "BD", "LK", "NP"];
const MIDDLE_EAST = ["TR", "IR", "IQ", "EG", "SA", "SY", "LB", "JO", "AE", "AF", "TN", "MA", "DZ", "IL", "KW", "QA", "YE"];
const EAST_EUROPE = ["RU", "PL", "CZ", "HU", "UA", "RO", "BG", "RS", "HR", "SK", "BY", "LT", "LV", "EE", "GE", "AM", "AZ"];
const NORTH_AMERICA = ["US", "CA"];
const LATIN_AMERICA = ["MX", "BR", "AR", "CL", "CO", "PE", "CU", "VE", "PR", "DO", "UY", "GT", "EC", "BO", "PY", "CR", "PA", "JM", "HT", "TT"];
const AFRICA = ["ZA", "NG", "KE", "ET", "GH", "SN", "CD", "TZ", "UG", "ZW", "CM", "CI", "ML", "MZ", "AO"];
const STEPPE = ["MN", "UZ", "KZ"];

export interface CelebWorldInput {
  nationality?: string | null;
  birthDate?: string | null;
  /** 생년이 없을 때 시대 판정에 쓴다. 옛 인물은 사망 연도만 남은 경우가 많다 */
  deathDate?: string | null;
  tier?: string | null;
  /** 규칙이 틀리는 인물을 손으로 바로잡는 자리 */
  worldOverride?: string | null;
}

/** "1545-04-28" · "1206" · "-360" 어느 형태든 연도만 뽑는다 */
function parseYear(value?: string | null): number | null {
  if (!value) return null;
  const matched = /^-?\d{1,4}/.exec(value.trim());
  if (!matched) return null;
  const year = Number.parseInt(matched[0], 10);
  return Number.isFinite(year) ? year : null;
}

export function resolveCelebWorld(input: CelebWorldInput): string {
  if (input.worldOverride && WORLD_IDS.has(input.worldOverride)) return input.worldOverride;
  if (input.tier === "fiction") return "myth";

  const nat = input.nationality ?? "";
  const year = parseYear(input.birthDate) ?? parseYear(input.deathDate);

  // 연도를 모르면 어느 시대인지 정할 수 없다. 근현대로 밀지 않고 중립으로 둔다.
  if (year === null) return "neutral";

  if (nat === "KR" || nat === "KP") {
    if (year < 668) return "three-kingdoms-korea";
    if (year < 1392) return "goryeo";
    if (year < 1897) return "joseon";
    return "modern-korea";
  }
  if (CHINA.includes(nat)) {
    if (year < -221) return "warring-states-china";
    if (year < 589) return "han-china";
    if (year < 1279) return "tang-song";
    if (year < 1912) return "ming-qing";
    return "modern-china";
  }
  if (nat === "JP") {
    if (year < 1185) return "ancient-japan";
    if (year < 1600) return "samurai-japan";
    if (year < 1868) return "edo";
    return "modern-japan";
  }
  if (STEPPE.includes(nat)) return "steppe";
  if (nat === "GR" && year < 146) return "ancient-greece";
  if (nat === "IT" && year < 476) return "rome";
  if (SOUTH_ASIA.includes(nat)) {
    if (year < 1200) return "ancient-india";
    if (year < 1858) return "mughal";
    return "modern-india";
  }
  if (MIDDLE_EAST.includes(nat)) {
    if (year < 650) return "ancient-near-east";
    if (year < 1259) return "islamic-golden-age";
    if (year < 1923) return "ottoman-persia";
    return "modern-middle-east";
  }
  if (EAST_EUROPE.includes(nat)) {
    if (year < 1700) return "medieval-rus";
    if (year < 1918) return "imperial-russia";
    return "soviet-east-europe";
  }
  if (NORTH_AMERICA.includes(nat)) {
    if (year < 1800) return "colonial-america";
    if (year < 1900) return "frontier-america";
    if (year < 1946) return "world-wars";
    return "modern-america";
  }
  if (LATIN_AMERICA.includes(nat)) return "latin-america";
  if (AFRICA.includes(nat)) return "africa";

  // 남은 유럽·오세아니아와 국적 미상은 연도로만 가른다
  if (year < 1450) return "medieval-europe";
  if (year < 1600) return "renaissance";
  if (year < 1750) return "age-of-sail";
  if (year < 1900) return "industrial-europe";
  if (year < 1946) return "world-wars";
  return "modern-west";
}

export function getCelebWorld(id: string): CelebWorld {
  return CELEB_WORLDS.find((world) => world.id === id) ?? CELEB_WORLDS[CELEB_WORLDS.length - 1];
}
