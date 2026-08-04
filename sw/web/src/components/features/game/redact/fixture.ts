/**
 * 가림 해제 게임 체험 표본
 *
 * ⚠️ 체험 모드 전용: DB 접속이 불가능할 때 사용.
 * ⚠️ 모든 인물 정보(이름·생몰년·직군·국적)와 소개글 내용은 사실이다.
 *    명언·위작을 지어내지 않았다.
 *    bio는 해당 인물의 공지 사실만으로 구성했다.
 */

import type { RedactRoundData } from './types';

interface FixtureCeleb {
  id: string;
  nickname: string;
  nickname_en: string;
  profession: string;
  nationality: string;
  birthDeath: string;
  avatarUrl: null;
  /** 이름 마스킹 전의 원문 bio */
  bio: string;
}

/**
 * 체험 표본 인물 10명
 * 이름·생몰년·직군·국적·소개글은 확인된 공지 사실만.
 */
const FIXTURE_POOL: FixtureCeleb[] = [
  {
    id: 'fix-r-01',
    nickname: '아이작 뉴턴',
    nickname_en: 'Isaac Newton',
    profession: 'scientist',
    nationality: 'GB',
    birthDeath: '1643 – 1727',
    avatarUrl: null,
    bio: '영국의 물리학자이자 수학자로, 만유인력의 법칙과 고전역학의 토대를 세웠다. 미적분학을 독립적으로 발전시켰으며, 광학 분야에서 프리즘을 통한 빛의 분산 실험으로 백색광이 여러 색의 합성임을 증명했다. 케임브리지 대학교 루커스 수학 석좌교수를 지냈고, 왕립학회 회장을 역임했다. 주저 《프린키피아》에서 운동의 세 법칙을 정립하여 근대 과학혁명의 핵심 인물로 평가받는다.',
  },
  {
    id: 'fix-r-02',
    nickname: '레오나르도 다 빈치',
    nickname_en: 'Leonardo da Vinci',
    profession: 'scientist',
    nationality: 'IT',
    birthDeath: '1452 – 1519',
    avatarUrl: null,
    bio: '이탈리아 르네상스를 대표하는 화가이자 발명가, 과학자, 공학자이다. 《모나리자》와 《최후의 만찬》을 그렸으며, 해부학·수력학·비행 기계 설계에 이르는 방대한 수기를 남겼다. 피렌체의 안드레아 델 베로키오 공방에서 수학한 뒤 밀라노 공작 루도비코 스포르차의 궁정에서 활동했다. 관찰과 실험을 통해 자연을 이해하려 한 그의 방법론은 근대 과학 정신의 선구로 여겨진다.',
  },
  {
    id: 'fix-r-03',
    nickname: '공자',
    nickname_en: 'Confucius',
    profession: 'humanities_scholar',
    nationality: 'CN',
    birthDeath: '-551 – -479',
    avatarUrl: null,
    bio: '춘추시대 노나라 출신의 사상가로, 인(仁)과 예(禮)를 핵심으로 하는 유교의 창시자이다. 관직에서 물러난 뒤 제자 삼천 명을 가르쳤으며, 그의 언행을 모은 《논어》는 동아시아 사상사의 근간이 되었다. 군자의 덕목과 올바른 통치를 설파했고, 주나라의 예악 질서를 회복하려 했다. 동아시아 전역에서 이천 년 넘게 교육과 정치의 기본 원리로 받아들여졌다.',
  },
  {
    id: 'fix-r-04',
    nickname: '마리 퀴리',
    nickname_en: 'Marie Curie',
    profession: 'scientist',
    nationality: 'PL',
    birthDeath: '1867 – 1934',
    avatarUrl: null,
    bio: '폴란드 태생으로 프랑스에서 활동한 물리학자이자 화학자이다. 방사능 연구의 선구자로, 폴로늄과 라듐을 발견했다. 노벨 물리학상과 노벨 화학상을 모두 수상한 최초의 인물이며, 소르본 대학교 최초의 여성 교수이기도 하다. 남편 피에르와 함께 방사능 현상을 체계적으로 연구했고, 제1차 세계대전 중에는 이동식 엑스선 장비를 전선에 보급하여 부상병 치료에 기여했다.',
  },
  {
    id: 'fix-r-05',
    nickname: '세종대왕',
    nickname_en: 'Sejong the Great',
    profession: 'politician',
    nationality: 'KR',
    birthDeath: '1397 – 1450',
    avatarUrl: null,
    bio: '조선의 제4대 왕으로, 한글(훈민정음)을 창제하여 백성이 글을 읽고 쓸 수 있도록 했다. 집현전을 확대하여 학문 연구를 장려했고, 장영실의 과학 기구 개발을 지원하여 측우기·해시계·자격루 등을 만들게 했다. 대마도 정벌과 사군육진 개척으로 영토를 정비했으며, 농사직설을 펴내 농업 기술을 보급했다. 32년간 재위하며 조선 문화의 황금기를 이끌었다.',
  },
  {
    id: 'fix-r-06',
    nickname: '나폴레옹 보나파르트',
    nickname_en: 'Napoleon Bonaparte',
    profession: 'commander',
    nationality: 'FR',
    birthDeath: '1769 – 1821',
    avatarUrl: null,
    bio: '프랑스 혁명기에 군사적 천재성으로 두각을 나타낸 뒤 쿠데타를 통해 권력을 장악하고 황제에 올랐다. 아우스터리츠 전투 등 수많은 승리로 유럽 대부분을 지배했으나, 러시아 원정 실패와 워털루 전투 패배로 몰락했다. 법전 편찬(나폴레옹 법전)으로 근대 법체계의 기초를 놓았으며, 도량형 통일과 행정 개혁을 단행했다. 세인트헬레나 섬에서 유배 생활을 하다 생을 마감했다.',
  },
  {
    id: 'fix-r-07',
    nickname: '찰스 다윈',
    nickname_en: 'Charles Darwin',
    profession: 'scientist',
    nationality: 'GB',
    birthDeath: '1809 – 1882',
    avatarUrl: null,
    bio: '영국의 박물학자로, 자연선택에 의한 진화론을 제시하여 생물학의 근본 패러다임을 바꾸었다. 비글호 항해(1831~1836) 중 갈라파고스 제도의 핀치새 변이를 관찰한 것이 이론의 단서가 되었다. 20여 년에 걸친 연구 끝에 《종의 기원》(1859)을 출간했으며, 앨프리드 러셀 월리스와 독립적으로 같은 결론에 도달했다. 그의 이론은 출간 당시 격렬한 논쟁을 일으켰으나, 현대 생물학의 통합 원리로 정착했다.',
  },
  {
    id: 'fix-r-08',
    nickname: '모차르트',
    nickname_en: 'Wolfgang Amadeus Mozart',
    profession: 'musician',
    nationality: 'AT',
    birthDeath: '1756 – 1791',
    avatarUrl: null,
    bio: '잘츠부르크 태생의 작곡가로, 다섯 살 때 첫 작곡을 시작하여 서양 음악사에서 가장 위대한 천재 중 한 명으로 꼽힌다. 교향곡, 협주곡, 오페라, 실내악 등 모든 장르에서 걸작을 남겼다. 대표작으로 《피가로의 결혼》, 《돈 조반니》, 《마술피리》 등의 오페라와 레퀴엠이 있다. 35세에 요절했으나 생전에 600곡 이상을 작곡했으며, 그의 음악은 고전주의 양식의 완성으로 평가받는다.',
  },
  {
    id: 'fix-r-09',
    nickname: '간디',
    nickname_en: 'Mahatma Gandhi',
    profession: 'leader',
    nationality: 'IN',
    birthDeath: '1869 – 1948',
    avatarUrl: null,
    bio: '인도의 독립운동 지도자로, 비폭력·불복종 운동(사티아그라하)을 이끌어 영국 식민 지배에 저항했다. 남아프리카에서 인도인 차별에 맞서 활동한 뒤 인도로 돌아와 소금 행진, 스와데시 운동 등을 주도했다. 직접 물레를 돌려 자급자족의 상징으로 삼았고, 힌두교와 이슬람교의 화합을 위해 힘썼다. 1947년 인도 독립 후 이듬해 암살당했으며, 비폭력 저항의 세계적 상징이 되었다.',
  },
  {
    id: 'fix-r-10',
    nickname: '소크라테스',
    nickname_en: 'Socrates',
    profession: 'humanities_scholar',
    nationality: 'GR',
    birthDeath: '-470 – -399',
    avatarUrl: null,
    bio: '고대 아테네의 철학자로, 서양 철학의 근본적 전환을 이끈 인물이다. 직접 저술을 남기지 않았으나 제자 플라톤의 대화편을 통해 그의 사상이 전해진다. 대화와 질문을 통해 상대방의 무지를 드러내는 산파술(문답법)을 사용했고, "너 자신을 알라"는 정신을 실천했다. 아테네 청년을 타락시킨다는 혐의로 재판을 받아 사형을 선고받았으며, 독배를 마시고 생을 마감했다.',
  },
];

/**
 * 이름 마스킹을 적용하여 RedactRoundData를 생성한다.
 */
function applyMasking(celeb: FixtureCeleb): RedactRoundData {
  const censoredWords: string[] = [];
  let text = celeb.bio;

  // 풀네임 치환
  const fullEsc = celeb.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(fullEsc, 'gi').test(text)) {
    censoredWords.push(celeb.nickname);
    text = text.replace(new RegExp(fullEsc, 'gi'), '■■■');
  }

  // 토큰별 치환
  const tokens = celeb.nickname.split(/\s+/).filter((t) => t.length >= 2);
  for (const token of tokens) {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![가-힣ㄱ-ㅎa-zA-Z0-9_])${esc}`, 'gi');
    if (regex.test(text)) {
      censoredWords.push(token);
      text = text.replace(regex, '■■■');
    }
  }

  // 영문 이름 토큰도 치환 (bio에 영문이 섞일 수 있음)
  const enTokens = celeb.nickname_en.split(/\s+/).filter((t) => t.length >= 2);
  for (const token of enTokens) {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'gi');
    if (regex.test(text)) {
      censoredWords.push(token);
      text = text.replace(regex, '■■■');
    }
  }

  return {
    celebId: celeb.id,
    text,
    nickname: celeb.nickname,
    profession: celeb.profession,
    nationality: celeb.nationality,
    birthDeath: celeb.birthDeath,
    avatarUrl: celeb.avatarUrl,
    censoredWords: [...new Set(censoredWords)],
    isSample: true,
  };
}

/** 체험 표본에서 랜덤 1명의 라운드 데이터를 생성한다 */
export function getFixtureRound(): RedactRoundData {
  const celeb = FIXTURE_POOL[Math.floor(Math.random() * FIXTURE_POOL.length)];
  return applyMasking(celeb);
}

/** 표본 전체 풀 크기 (테스트용) */
export const FIXTURE_POOL_SIZE = FIXTURE_POOL.length;
