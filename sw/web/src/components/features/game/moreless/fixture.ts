/**
 * 어느 쪽 게임 체험 표본
 *
 * ⚠️ 체험 모드 전용: DB 접속이 불가능할 때 사용.
 * 인물의 이름·생몰년·직군·국적은 모두 사실이다.
 *
 * total_score는 이 서비스의 영향력 평가 체계(정치·전략·기술·사회·경제·문화·통시성 7축 합산)에서
 * 실제로 부여될 법한 값을 추정한 것이다. DB 실측값이 아님을 표본 모드 배너로 고지한다.
 * 게임 성립의 핵심인 "대소 비교"가 상식적으로 성립하는 쌍을 만들기 위해
 * 비교적 명확한 격차가 있는 인물 50명을 선별했다.
 */

import type { MorelessCeleb } from './types';

export const FIXTURE_CELEBS: MorelessCeleb[] = [
  // 최고 등급 (85-100)
  { id: 'ml-01', nickname: '공자', nickname_en: 'Confucius', profession: 'humanities_scholar', nationality: 'CN', birth_date: '-551', death_date: '-479', avatar_url: null, total_score: 97 },
  { id: 'ml-02', nickname: '아이작 뉴턴', nickname_en: 'Isaac Newton', profession: 'scientist', nationality: 'GB', birth_date: '1643', death_date: '1727', avatar_url: null, total_score: 93 },
  { id: 'ml-03', nickname: '알렉산드로스 대왕', nickname_en: 'Alexander the Great', profession: 'commander', nationality: 'GR', birth_date: '-356', death_date: '-323', avatar_url: null, total_score: 91 },
  { id: 'ml-04', nickname: '나폴레옹 보나파르트', nickname_en: 'Napoleon Bonaparte', profession: 'commander', nationality: 'FR', birth_date: '1769', death_date: '1821', avatar_url: null, total_score: 89 },
  { id: 'ml-05', nickname: '레오나르도 다 빈치', nickname_en: 'Leonardo da Vinci', profession: 'scientist', nationality: 'IT', birth_date: '1452', death_date: '1519', avatar_url: null, total_score: 88 },
  { id: 'ml-06', nickname: '알베르트 아인슈타인', nickname_en: 'Albert Einstein', profession: 'scientist', nationality: 'DE', birth_date: '1879', death_date: '1955', avatar_url: null, total_score: 90 },
  { id: 'ml-07', nickname: '징기스칸', nickname_en: 'Genghis Khan', profession: 'commander', nationality: 'MN', birth_date: '1162', death_date: '1227', avatar_url: null, total_score: 92 },

  // 높은 등급 (70-84)
  { id: 'ml-08', nickname: '셰익스피어', nickname_en: 'William Shakespeare', profession: 'author', nationality: 'GB', birth_date: '1564', death_date: '1616', avatar_url: null, total_score: 82 },
  { id: 'ml-09', nickname: '간디', nickname_en: 'Mahatma Gandhi', profession: 'leader', nationality: 'IN', birth_date: '1869', death_date: '1948', avatar_url: null, total_score: 78 },
  { id: 'ml-10', nickname: '카를 마르크스', nickname_en: 'Karl Marx', profession: 'social_scientist', nationality: 'DE', birth_date: '1818', death_date: '1883', avatar_url: null, total_score: 80 },
  { id: 'ml-11', nickname: '다윈', nickname_en: 'Charles Darwin', profession: 'scientist', nationality: 'GB', birth_date: '1809', death_date: '1882', avatar_url: null, total_score: 76 },
  { id: 'ml-12', nickname: '베토벤', nickname_en: 'Ludwig van Beethoven', profession: 'musician', nationality: 'DE', birth_date: '1770', death_date: '1827', avatar_url: null, total_score: 74 },
  { id: 'ml-13', nickname: '플라톤', nickname_en: 'Plato', profession: 'humanities_scholar', nationality: 'GR', birth_date: '-428', death_date: '-348', avatar_url: null, total_score: 84 },
  { id: 'ml-14', nickname: '에이브러햄 링컨', nickname_en: 'Abraham Lincoln', profession: 'politician', nationality: 'US', birth_date: '1809', death_date: '1865', avatar_url: null, total_score: 75 },
  { id: 'ml-15', nickname: '쿠빌라이 칸', nickname_en: 'Kublai Khan', profession: 'politician', nationality: 'MN', birth_date: '1215', death_date: '1294', avatar_url: null, total_score: 71 },

  // 중상 등급 (55-69)
  { id: 'ml-16', nickname: '니콜라 테슬라', nickname_en: 'Nikola Tesla', profession: 'scientist', nationality: 'US', birth_date: '1856', death_date: '1943', avatar_url: null, total_score: 68 },
  { id: 'ml-17', nickname: '갈릴레오 갈릴레이', nickname_en: 'Galileo Galilei', profession: 'scientist', nationality: 'IT', birth_date: '1564', death_date: '1642', avatar_url: null, total_score: 72 },
  { id: 'ml-18', nickname: '미켈란젤로', nickname_en: 'Michelangelo', profession: 'visual_artist', nationality: 'IT', birth_date: '1475', death_date: '1564', avatar_url: null, total_score: 70 },
  { id: 'ml-19', nickname: '윈스턴 처칠', nickname_en: 'Winston Churchill', profession: 'politician', nationality: 'GB', birth_date: '1874', death_date: '1965', avatar_url: null, total_score: 69 },
  { id: 'ml-20', nickname: '마리 퀴리', nickname_en: 'Marie Curie', profession: 'scientist', nationality: 'PL', birth_date: '1867', death_date: '1934', avatar_url: null, total_score: 64 },
  { id: 'ml-21', nickname: '톨스토이', nickname_en: 'Leo Tolstoy', profession: 'author', nationality: 'RU', birth_date: '1828', death_date: '1910', avatar_url: null, total_score: 62 },
  { id: 'ml-22', nickname: '넬슨 만델라', nickname_en: 'Nelson Mandela', profession: 'politician', nationality: 'ZA', birth_date: '1918', death_date: '2013', avatar_url: null, total_score: 60 },
  { id: 'ml-23', nickname: '세종대왕', nickname_en: 'Sejong the Great', profession: 'politician', nationality: 'KR', birth_date: '1397', death_date: '1450', avatar_url: null, total_score: 66 },
  { id: 'ml-24', nickname: '모차르트', nickname_en: 'Wolfgang Amadeus Mozart', profession: 'musician', nationality: 'AT', birth_date: '1756', death_date: '1791', avatar_url: null, total_score: 67 },
  { id: 'ml-25', nickname: '도스토옙스키', nickname_en: 'Fyodor Dostoevsky', profession: 'author', nationality: 'RU', birth_date: '1821', death_date: '1881', avatar_url: null, total_score: 58 },

  // 중간 등급 (40-54)
  { id: 'ml-26', nickname: '빈센트 반 고흐', nickname_en: 'Vincent van Gogh', profession: 'visual_artist', nationality: 'NL', birth_date: '1853', death_date: '1890', avatar_url: null, total_score: 54 },
  { id: 'ml-27', nickname: '이순신', nickname_en: 'Yi Sun-sin', profession: 'commander', nationality: 'KR', birth_date: '1545', death_date: '1598', avatar_url: null, total_score: 52 },
  { id: 'ml-28', nickname: '마틴 루터 킹', nickname_en: 'Martin Luther King Jr.', profession: 'leader', nationality: 'US', birth_date: '1929', death_date: '1968', avatar_url: null, total_score: 50 },
  { id: 'ml-29', nickname: '니체', nickname_en: 'Friedrich Nietzsche', profession: 'humanities_scholar', nationality: 'DE', birth_date: '1844', death_date: '1900', avatar_url: null, total_score: 56 },
  { id: 'ml-30', nickname: '제갈량', nickname_en: 'Zhuge Liang', profession: 'politician', nationality: 'CN', birth_date: '181', death_date: '234', avatar_url: null, total_score: 48 },
  { id: 'ml-31', nickname: '잔 다르크', nickname_en: 'Joan of Arc', profession: 'commander', nationality: 'FR', birth_date: '1412', death_date: '1431', avatar_url: null, total_score: 46 },
  { id: 'ml-32', nickname: '체 게바라', nickname_en: 'Che Guevara', profession: 'politician', nationality: 'AR', birth_date: '1928', death_date: '1967', avatar_url: null, total_score: 44 },
  { id: 'ml-33', nickname: '일론 머스크', nickname_en: 'Elon Musk', profession: 'entrepreneur', nationality: 'US', birth_date: '1971', death_date: null, avatar_url: null, total_score: 51 },
  { id: 'ml-34', nickname: '스티브 잡스', nickname_en: 'Steve Jobs', profession: 'entrepreneur', nationality: 'US', birth_date: '1955', death_date: '2011', avatar_url: null, total_score: 53 },
  { id: 'ml-35', nickname: '소크라테스', nickname_en: 'Socrates', profession: 'humanities_scholar', nationality: 'GR', birth_date: '-470', death_date: '-399', avatar_url: null, total_score: 79 },

  // 중하 등급 (25-39)
  { id: 'ml-36', nickname: '무함마드 알리', nickname_en: 'Muhammad Ali', profession: 'athlete', nationality: 'US', birth_date: '1942', death_date: '2016', avatar_url: null, total_score: 38 },
  { id: 'ml-37', nickname: '마르코 폴로', nickname_en: 'Marco Polo', profession: 'author', nationality: 'IT', birth_date: '1254', death_date: '1324', avatar_url: null, total_score: 36 },
  { id: 'ml-38', nickname: '워렌 버핏', nickname_en: 'Warren Buffett', profession: 'investor', nationality: 'US', birth_date: '1930', death_date: null, avatar_url: null, total_score: 40 },
  { id: 'ml-39', nickname: '클레오파트라', nickname_en: 'Cleopatra', profession: 'politician', nationality: 'EG', birth_date: '-69', death_date: '-30', avatar_url: null, total_score: 42 },
  { id: 'ml-40', nickname: '바흐', nickname_en: 'Johann Sebastian Bach', profession: 'musician', nationality: 'DE', birth_date: '1685', death_date: '1750', avatar_url: null, total_score: 60 },
  { id: 'ml-41', nickname: '쑨원', nickname_en: 'Sun Yat-sen', profession: 'politician', nationality: 'CN', birth_date: '1866', death_date: '1925', avatar_url: null, total_score: 55 },
  { id: 'ml-42', nickname: '조조', nickname_en: 'Cao Cao', profession: 'commander', nationality: 'CN', birth_date: '155', death_date: '220', avatar_url: null, total_score: 47 },

  // 하위 등급 (10-24)
  { id: 'ml-43', nickname: '클로드 모네', nickname_en: 'Claude Monet', profession: 'visual_artist', nationality: 'FR', birth_date: '1840', death_date: '1926', avatar_url: null, total_score: 30 },
  { id: 'ml-45', nickname: '앨런 튜링', nickname_en: 'Alan Turing', profession: 'scientist', nationality: 'GB', birth_date: '1912', death_date: '1954', avatar_url: null, total_score: 45 },
  { id: 'ml-46', nickname: '헤르만 헤세', nickname_en: 'Hermann Hesse', profession: 'author', nationality: 'DE', birth_date: '1877', death_date: '1962', avatar_url: null, total_score: 26 },
  { id: 'ml-47', nickname: '니콜로 마키아벨리', nickname_en: 'Niccolo Machiavelli', profession: 'humanities_scholar', nationality: 'IT', birth_date: '1469', death_date: '1527', avatar_url: null, total_score: 43 },
  { id: 'ml-48', nickname: '프레데리크 쇼팽', nickname_en: 'Frederic Chopin', profession: 'musician', nationality: 'PL', birth_date: '1810', death_date: '1849', avatar_url: null, total_score: 28 },
  { id: 'ml-49', nickname: '마르쿠스 아우렐리우스', nickname_en: 'Marcus Aurelius', profession: 'humanities_scholar', nationality: 'IT', birth_date: '121', death_date: '180', avatar_url: null, total_score: 49 },
  { id: 'ml-50', nickname: '라파엘로 산치오', nickname_en: 'Raphael Sanzio', profession: 'visual_artist', nationality: 'IT', birth_date: '1483', death_date: '1520', avatar_url: null, total_score: 32 },
];
