/*
  파일명: /components/features/library/curated/curatorBrandPalettes.ts
  기능: 각 기관별 공식 시그니처 컬러, 앰비언트 그라데이션, 모노그램 맵
  책임: 대학·언론·시상 기관의 고유한 브랜드 아이덴티티와 색채를 카드 UI에 공급한다.
*/ // ------------------------------

export interface CuratorBrandPalette {
  primary: string;
  accent: string;
  monogram: string;
  nameEn?: string;
  gradient: string;
  borderGlow: string;
  badgeBg: string;
  badgeText: string;
}

const BRAND_CONFIGS: Record<
  string,
  { primary: string; accent: string; monogram: string; nameEn?: string }
> = {
  // ── 교육 기관 (University) ──
  "seoul-national-university": {
    primary: "#0f2b5c",
    accent: "#60a5fa",
    monogram: "SNU",
    nameEn: "SEOUL NATIONAL UNIVERSITY",
  },
  "hanyang-university": {
    primary: "#0e4a86",
    accent: "#59a5ec",
    monogram: "HYU",
    nameEn: "HANYANG UNIVERSITY",
  },
  "university-of-seoul": {
    primary: "#004b87",
    accent: "#38bdf8",
    monogram: "UOS",
    nameEn: "UNIVERSITY OF SEOUL",
  },
  "sogang-university": {
    primary: "#8b1528",
    accent: "#f87171",
    monogram: "SG",
    nameEn: "SOGANG UNIVERSITY",
  },
  "chung-ang-university": {
    primary: "#004098",
    accent: "#60a5fa",
    monogram: "CAU",
    nameEn: "CHUNG-ANG UNIVERSITY",
  },
  "korea-university": {
    primary: "#86172e",
    accent: "#fb7185",
    monogram: "KU",
    nameEn: "KOREA UNIVERSITY",
  },
  "yonsei-university": {
    primary: "#003876",
    accent: "#38bdf8",
    monogram: "YONSEI",
    nameEn: "YONSEI UNIVERSITY",
  },
  "sungkyunkwan-university": {
    primary: "#175338",
    accent: "#4ade80",
    monogram: "SKKU",
    nameEn: "SUNGKYUNKWAN UNIVERSITY",
  },
  "cambridge-philosophy": {
    primary: "#7a1a2b",
    accent: "#fca5a5",
    monogram: "CAM",
    nameEn: "UNIVERSITY OF CAMBRIDGE",
  },
  "st-johns-college": {
    primary: "#1e3a5f",
    accent: "#93c5fd",
    monogram: "SJC",
    nameEn: "ST. JOHN'S COLLEGE",
  },
  kaist: {
    primary: "#004191",
    accent: "#38bdf8",
    monogram: "KAIST",
    nameEn: "KAIST",
  },
  postech: {
    primary: "#9e122a",
    accent: "#f87171",
    monogram: "POSTECH",
    nameEn: "POSTECH",
  },
  "inha-university": {
    primary: "#004b8d",
    accent: "#60a5fa",
    monogram: "INHA",
    nameEn: "INHA UNIVERSITY",
  },

  // ── 언론·매체 (Media) ──
  "new-york-times": {
    primary: "#1c1c1e",
    accent: "#e4e4e7",
    monogram: "NYT",
    nameEn: "THE NEW YORK TIMES",
  },
  "time-magazine": {
    primary: "#991b1b",
    accent: "#f87171",
    monogram: "TIME",
    nameEn: "TIME MAGAZINE",
  },
  "financial-times": {
    primary: "#701a2c",
    accent: "#fca5a5",
    monogram: "FT",
    nameEn: "FINANCIAL TIMES",
  },
  "the-guardian": {
    primary: "#004f7c",
    accent: "#38bdf8",
    monogram: "GUA",
    nameEn: "THE GUARDIAN",
  },
  bbc: {
    primary: "#881337",
    accent: "#fb7185",
    monogram: "BBC",
    nameEn: "BRITISH BROADCASTING",
  },
  "bbc-culture": {
    primary: "#881337",
    accent: "#fb7185",
    monogram: "BBC",
    nameEn: "BBC CULTURE",
  },
  "sight-and-sound": {
    primary: "#831843",
    accent: "#f472b6",
    monogram: "S&S",
    nameEn: "SIGHT & SOUND",
  },
  "time-out": {
    primary: "#1e293b",
    accent: "#38bdf8",
    monogram: "TIMEOUT",
    nameEn: "TIME OUT",
  },
  "hankook-ilbo": {
    primary: "#004182",
    accent: "#60a5fa",
    monogram: "HK",
    nameEn: "HANKOOK ILBO",
  },
  "hyundae-munhak": {
    primary: "#14532d",
    accent: "#86efac",
    monogram: "HD",
    nameEn: "HYUNDAE MUNHAK",
  },
  npr: {
    primary: "#1e3a8a",
    accent: "#60a5fa",
    monogram: "NPR",
    nameEn: "NATIONAL PUBLIC RADIO",
  },
  "le-monde": {
    primary: "#1e293b",
    accent: "#cbd5e1",
    monogram: "LM",
    nameEn: "LE MONDE",
  },
  cnn: {
    primary: "#991b1b",
    accent: "#fca5a5",
    monogram: "CNN",
    nameEn: "CNN",
  },
  "locus-magazine": {
    primary: "#3b0764",
    accent: "#d8b4fe",
    monogram: "LOCUS",
    nameEn: "LOCUS MAGAZINE",
  },

  // ── 시상 기관 & 영화제 (Award & Festival) ──
  "pulitzer-prize": {
    primary: "#854d0e",
    accent: "#facc15",
    monogram: "PULITZER",
    nameEn: "THE PULITZER PRIZES",
  },
  "academy-awards": {
    primary: "#92400e",
    accent: "#fbbf24",
    monogram: "OSCAR",
    nameEn: "THE ACADEMY AWARDS",
  },
  "cannes-film-festival": {
    primary: "#a16207",
    accent: "#fde047",
    monogram: "CANNES",
    nameEn: "FESTIVAL DE CANNES",
  },
  "venice-film-festival": {
    primary: "#831843",
    accent: "#f472b6",
    monogram: "VENICE",
    nameEn: "LA BIENNALE DI VENEZIA",
  },
  "blue-dragon-film-awards": {
    primary: "#1e3a8a",
    accent: "#60a5fa",
    monogram: "BLUE DRAGON",
    nameEn: "BLUE DRAGON AWARDS",
  },
  "academie-goncourt": {
    primary: "#701a75",
    accent: "#f472b6",
    monogram: "GONCOURT",
    nameEn: "ACADÉMIE GONCOURT",
  },
  "hugo-awards": {
    primary: "#312e81",
    accent: "#a5b4fc",
    monogram: "HUGO",
    nameEn: "HUGO AWARDS",
  },
  "national-book-foundation": {
    primary: "#1e3a8a",
    accent: "#93c5fd",
    monogram: "NBA",
    nameEn: "NATIONAL BOOK AWARDS",
  },
  "womens-prize": {
    primary: "#831843",
    accent: "#f9a8d4",
    monogram: "WOMEN",
    nameEn: "WOMEN'S PRIZE",
  },
  "baillie-gifford-prize": {
    primary: "#064e3b",
    accent: "#6ee7b7",
    monogram: "BG",
    nameEn: "BAILLIE GIFFORD",
  },
  "nihon-bungaku-shinkokai": {
    primary: "#451a03",
    accent: "#fbbf24",
    monogram: "BUNGAKU",
    nameEn: "NIHON BUNGAKU SHINKOKAI",
  },

  // ── 협회·단체·도서관 (Organization & Library) ──
  "american-film-institute": {
    primary: "#1e293b",
    accent: "#cbd5e1",
    monogram: "AFI",
    nameEn: "AMERICAN FILM INSTITUTE",
  },
  "royal-society": {
    primary: "#1e3a8a",
    accent: "#93c5fd",
    monogram: "RS",
    nameEn: "THE ROYAL SOCIETY",
  },
  "american-library-association": {
    primary: "#0f766e",
    accent: "#5eead4",
    monogram: "ALA",
    nameEn: "AMERICAN LIBRARY ASSOC",
  },
  sfwa: {
    primary: "#4c1d95",
    accent: "#c084fc",
    monogram: "SFWA",
    nameEn: "SF & FANTASY WRITERS",
  },
  "mystery-writers-of-america": {
    primary: "#334155",
    accent: "#94a3b8",
    monogram: "MWA",
    nameEn: "MYSTERY WRITERS OF AMERICA",
  },
};

const KIND_DEFAULTS: Record<
  string,
  { primary: string; accent: string; monogram: string; nameEn: string }
> = {
  university: {
    primary: "#0f2b5c",
    accent: "#60a5fa",
    monogram: "ACADEMIA",
    nameEn: "ACADEMIC HERITAGE",
  },
  media: {
    primary: "#18181b",
    accent: "#a1a1aa",
    monogram: "PRESS",
    nameEn: "JOURNALISM ARCHIVE",
  },
  award: {
    primary: "#78350f",
    accent: "#fbbf24",
    monogram: "AWARD",
    nameEn: "HONOR & MERIT",
  },
  festival: {
    primary: "#831843",
    accent: "#f472b6",
    monogram: "FESTIVAL",
    nameEn: "FESTIVAL SELECTION",
  },
  library: {
    primary: "#0f766e",
    accent: "#5eead4",
    monogram: "LIBRARY",
    nameEn: "LIBRARY ARCHIVE",
  },
  organization: {
    primary: "#1e293b",
    accent: "#94a3b8",
    monogram: "INSTITUTE",
    nameEn: "OFFICIAL INSTITUTE",
  },
  community: {
    primary: "#1e1b4b",
    accent: "#818cf8",
    monogram: "PUBLIC",
    nameEn: "PUBLIC CHOICE",
  },
};

export function getCuratorBrand(
  slug?: string | null,
  kind?: string | null
): CuratorBrandPalette {
  const base =
    (slug && BRAND_CONFIGS[slug]) ||
    (kind && KIND_DEFAULTS[kind]) ||
    KIND_DEFAULTS.university;

  // 좌상단에서 은은하게 번지는 깊은 다크 앰비언트 그라데이션
  const gradient = `radial-gradient(130% 90% at 0% 0%, ${base.primary}40 0%, ${base.primary}18 45%, rgba(18, 18, 18, 0.95) 85%)`;
  const borderGlow = `border-${base.accent}/30`;
  const badgeBg = `${base.primary}33`;
  const badgeText = base.accent;

  return {
    primary: base.primary,
    accent: base.accent,
    monogram: base.monogram,
    nameEn: base.nameEn,
    gradient,
    borderGlow,
    badgeBg,
    badgeText,
  };
}
