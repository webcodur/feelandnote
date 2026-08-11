/**
 * 근접도 게임 체험 표본
 *
 * ⚠️ 체험 모드 전용: DB 접속이 불가능할 때 사용.
 * ⚠️ 성향 점수(SpectrumStats 16축)는 DB에만 있으며, 여기서 지어내지 않는다.
 *    체험 모드에서는 시대·지역·직군만으로 거리를 계산하는 대체 규칙을 쓴다.
 *
 * 인물의 이름·생몰년·직군·국적은 모두 사실이다. 확인 불가한 값은 넣지 않았다.
 */

import type { SpectrumStats } from '@/lib/spectrum/types';
import type { ProximityCeleb, ProximityCelebFull } from './types';

/** 체험 모드에서 사용하는 제로 성향 벡터 (거리 계산에 쓰지 않음을 명시) */
const ZERO_STATS: SpectrumStats = {
  command: 0,
  martial: 0,
  intellect: 0,
  charm: 0,
  temperance: 0,
  diligence: 0,
  reflection: 0,
  courage: 0,
  loyalty: 0,
  benevolence: 0,
  fairness: 0,
  humility: 0,
  pessimism_optimism: 0,
  conservative_progressive: 0,
  individual_social: 0,
  cautious_bold: 0,
};

/**
 * 체험 표본 인물 50명
 * 이름·생몰년·직군·국적만 사실로 확인된 값.
 */
export const FIXTURE_CELEBS: ProximityCelebFull[] = [
  { id: 'f-01', nickname: '아이작 뉴턴', nickname_en: 'Isaac Newton', profession: 'scientist', nationality: 'GB', birth_date: '1643', death_date: '1727', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-02', nickname: '알베르트 아인슈타인', nickname_en: 'Albert Einstein', profession: 'scientist', nationality: 'DE', birth_date: '1879', death_date: '1955', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-03', nickname: '레오나르도 다 빈치', nickname_en: 'Leonardo da Vinci', profession: 'scientist', nationality: 'IT', birth_date: '1452', death_date: '1519', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-04', nickname: '나폴레옹 보나파르트', nickname_en: 'Napoleon Bonaparte', profession: 'commander', nationality: 'FR', birth_date: '1769', death_date: '1821', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-05', nickname: '공자', nickname_en: 'Confucius', profession: 'humanities_scholar', nationality: 'CN', birth_date: '-551', death_date: '-479', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-06', nickname: '셰익스피어', nickname_en: 'William Shakespeare', profession: 'author', nationality: 'GB', birth_date: '1564', death_date: '1616', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-07', nickname: '간디', nickname_en: 'Mahatma Gandhi', profession: 'leader', nationality: 'IN', birth_date: '1869', death_date: '1948', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-08', nickname: '클레오파트라', nickname_en: 'Cleopatra', profession: 'politician', nationality: 'EG', birth_date: '-69', death_date: '-30', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-09', nickname: '베토벤', nickname_en: 'Ludwig van Beethoven', profession: 'musician', nationality: 'DE', birth_date: '1770', death_date: '1827', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-10', nickname: '징기스칸', nickname_en: 'Genghis Khan', profession: 'commander', nationality: 'MN', birth_date: '1162', death_date: '1227', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-11', nickname: '마리 퀴리', nickname_en: 'Marie Curie', profession: 'scientist', nationality: 'PL', birth_date: '1867', death_date: '1934', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-12', nickname: '소크라테스', nickname_en: 'Socrates', profession: 'humanities_scholar', nationality: 'GR', birth_date: '-470', death_date: '-399', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-13', nickname: '찰스 다윈', nickname_en: 'Charles Darwin', profession: 'scientist', nationality: 'GB', birth_date: '1809', death_date: '1882', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-14', nickname: '에이브러햄 링컨', nickname_en: 'Abraham Lincoln', profession: 'politician', nationality: 'US', birth_date: '1809', death_date: '1865', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-15', nickname: '모차르트', nickname_en: 'Wolfgang Amadeus Mozart', profession: 'musician', nationality: 'AT', birth_date: '1756', death_date: '1791', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-16', nickname: '쑨원', nickname_en: 'Sun Yat-sen', profession: 'politician', nationality: 'CN', birth_date: '1866', death_date: '1925', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-17', nickname: '니콜라 테슬라', nickname_en: 'Nikola Tesla', profession: 'scientist', nationality: 'US', birth_date: '1856', death_date: '1943', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-18', nickname: '잔 다르크', nickname_en: 'Joan of Arc', profession: 'commander', nationality: 'FR', birth_date: '1412', death_date: '1431', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-19', nickname: '카를 마르크스', nickname_en: 'Karl Marx', profession: 'social_scientist', nationality: 'DE', birth_date: '1818', death_date: '1883', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-20', nickname: '세종대왕', nickname_en: 'Sejong the Great', profession: 'politician', nationality: 'KR', birth_date: '1397', death_date: '1450', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-21', nickname: '스티브 잡스', nickname_en: 'Steve Jobs', profession: 'entrepreneur', nationality: 'US', birth_date: '1955', death_date: '2011', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-22', nickname: '갈릴레오 갈릴레이', nickname_en: 'Galileo Galilei', profession: 'scientist', nationality: 'IT', birth_date: '1564', death_date: '1642', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-23', nickname: '알렉산드로스 대왕', nickname_en: 'Alexander the Great', profession: 'commander', nationality: 'GR', birth_date: '-356', death_date: '-323', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-24', nickname: '일론 머스크', nickname_en: 'Elon Musk', profession: 'entrepreneur', nationality: 'US', birth_date: '1971', death_date: null, avatar_url: null, stats: ZERO_STATS },
  { id: 'f-25', nickname: '미켈란젤로', nickname_en: 'Michelangelo', profession: 'visual_artist', nationality: 'IT', birth_date: '1475', death_date: '1564', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-26', nickname: '도스토옙스키', nickname_en: 'Fyodor Dostoevsky', profession: 'author', nationality: 'RU', birth_date: '1821', death_date: '1881', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-27', nickname: '이순신', nickname_en: 'Yi Sun-sin', profession: 'commander', nationality: 'KR', birth_date: '1545', death_date: '1598', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-28', nickname: '마틴 루터 킹', nickname_en: 'Martin Luther King Jr.', profession: 'leader', nationality: 'US', birth_date: '1929', death_date: '1968', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-29', nickname: '빈센트 반 고흐', nickname_en: 'Vincent van Gogh', profession: 'visual_artist', nationality: 'NL', birth_date: '1853', death_date: '1890', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-30', nickname: '윈스턴 처칠', nickname_en: 'Winston Churchill', profession: 'politician', nationality: 'GB', birth_date: '1874', death_date: '1965', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-31', nickname: '제갈량', nickname_en: 'Zhuge Liang', profession: 'politician', nationality: 'CN', birth_date: '181', death_date: '234', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-32', nickname: '마르코 폴로', nickname_en: 'Marco Polo', profession: 'author', nationality: 'IT', birth_date: '1254', death_date: '1324', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-33', nickname: '무함마드 알리', nickname_en: 'Muhammad Ali', profession: 'athlete', nationality: 'US', birth_date: '1942', death_date: '2016', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-34', nickname: '요한 세바스티안 바흐', nickname_en: 'Johann Sebastian Bach', profession: 'musician', nationality: 'DE', birth_date: '1685', death_date: '1750', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-35', nickname: '쿠빌라이 칸', nickname_en: 'Kublai Khan', profession: 'politician', nationality: 'MN', birth_date: '1215', death_date: '1294', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-36', nickname: '넬슨 만델라', nickname_en: 'Nelson Mandela', profession: 'politician', nationality: 'ZA', birth_date: '1918', death_date: '2013', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-37', nickname: '톨스토이', nickname_en: 'Leo Tolstoy', profession: 'author', nationality: 'RU', birth_date: '1828', death_date: '1910', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-38', nickname: '체 게바라', nickname_en: 'Che Guevara', profession: 'politician', nationality: 'AR', birth_date: '1928', death_date: '1967', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-39', nickname: '플라톤', nickname_en: 'Plato', profession: 'humanities_scholar', nationality: 'GR', birth_date: '-428', death_date: '-348', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-40', nickname: '니체', nickname_en: 'Friedrich Nietzsche', profession: 'humanities_scholar', nationality: 'DE', birth_date: '1844', death_date: '1900', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-41', nickname: '조조', nickname_en: 'Cao Cao', profession: 'commander', nationality: 'CN', birth_date: '155', death_date: '220', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-42', nickname: '워렌 버핏', nickname_en: 'Warren Buffett', profession: 'investor', nationality: 'US', birth_date: '1930', death_date: null, avatar_url: null, stats: ZERO_STATS },
  { id: 'f-43', nickname: '파블로 피카소', nickname_en: 'Pablo Picasso', profession: 'visual_artist', nationality: 'ES', birth_date: '1881', death_date: '1973', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-44', nickname: '임마누엘 칸트', nickname_en: 'Immanuel Kant', profession: 'humanities_scholar', nationality: 'DE', birth_date: '1724', death_date: '1804', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-45', nickname: '율리우스 카이사르', nickname_en: 'Julius Caesar', profession: 'politician', nationality: 'IT', birth_date: '-100', death_date: '-44', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-46', nickname: '오다 노부나가', nickname_en: 'Oda Nobunaga', profession: 'commander', nationality: 'JP', birth_date: '1534', death_date: '1582', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-47', nickname: '앨런 튜링', nickname_en: 'Alan Turing', profession: 'scientist', nationality: 'GB', birth_date: '1912', death_date: '1954', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-48', nickname: '프리다 칼로', nickname_en: 'Frida Kahlo', profession: 'visual_artist', nationality: 'MX', birth_date: '1907', death_date: '1954', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-49', nickname: '무하마드 이븐 무사 알콰리즈미', nickname_en: 'Al-Khwarizmi', profession: 'scientist', nationality: 'UZ', birth_date: '780', death_date: '850', avatar_url: null, stats: ZERO_STATS },
  { id: 'f-50', nickname: '퀸 엘리자베스 1세', nickname_en: 'Elizabeth I', profession: 'politician', nationality: 'GB', birth_date: '1533', death_date: '1603', avatar_url: null, stats: ZERO_STATS },
];

/** 체험 모드: 자동완성용 간략 목록 */
export function getFixtureCelebList(locale: 'ko' | 'en' = 'ko'): ProximityCeleb[] {
  return FIXTURE_CELEBS.map((c) => ({
    id: c.id,
    nickname: locale === 'en' ? (c.nickname_en ?? c.nickname) : c.nickname,
    nickname_en: c.nickname_en,
    profession: c.profession,
    nationality: c.nationality,
    birth_date: c.birth_date,
    death_date: c.death_date,
    avatar_url: c.avatar_url,
  }));
}

/**
 * 체험 모드 대체 거리 계산 — 성향 점수 없이 시대·지역·직군만으로 0~100 온도를 매긴다.
 *
 * 배점:
 * - 같은 직군: +30
 * - 같은 나라: +30 / 같은 문화권: +15
 * - 시대 차이: 0년 → +40, 30년 이내 → +30, 100년 이내 → +20, 300년 이내 → +10, 그 이상 → +0
 *
 * 합산 후 0~100으로 클램프.
 */
export function calculateFixtureTemperature(
  guess: ProximityCelebFull,
  target: ProximityCelebFull
): number {
  let score = 0;

  // 직군
  if (guess.profession && target.profession && guess.profession === target.profession) {
    score += 30;
  }

  // 지역
  if (guess.nationality && target.nationality) {
    if (guess.nationality === target.nationality) {
      score += 30;
    } else {
      const gGroup = getFixtureRegionGroup(guess.nationality);
      const tGroup = getFixtureRegionGroup(target.nationality);
      if (gGroup && gGroup === tGroup) score += 15;
    }
  }

  // 시대
  const gYear = extractYear(guess.birth_date);
  const tYear = extractYear(target.birth_date);
  if (gYear !== null && tYear !== null) {
    const diff = Math.abs(gYear - tYear);
    if (diff === 0) score += 40;
    else if (diff <= 30) score += 30;
    else if (diff <= 100) score += 20;
    else if (diff <= 300) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

function extractYear(date: string | null): number | null {
  if (!date) return null;
  const n = parseInt(date, 10);
  return Number.isFinite(n) ? n : null;
}

function getFixtureRegionGroup(nationality: string): string | null {
  const map: Record<string, string[]> = {
    east_asia: ['KR', 'JP', 'CN', 'TW', 'MN'],
    south_asia: ['IN', 'PK', 'BD'],
    middle_east: ['IR', 'IQ', 'SA', 'AE', 'TR', 'IL', 'SY', 'EG'],
    europe_west: ['GB', 'FR', 'DE', 'NL', 'BE', 'AT', 'CH', 'IE'],
    europe_south: ['IT', 'ES', 'PT', 'GR'],
    europe_east: ['RU', 'PL', 'CZ', 'HU', 'UA', 'RO', 'RS'],
    americas: ['US', 'CA', 'BR', 'AR', 'CL', 'CO', 'MX', 'CU'],
    africa: ['ZA', 'NG', 'KE', 'GH', 'ET'],
  };
  for (const [region, codes] of Object.entries(map)) {
    if (codes.includes(nationality.toUpperCase())) return region;
  }
  return null;
}
