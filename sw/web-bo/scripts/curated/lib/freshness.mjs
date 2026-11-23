// 기관 목록 최신 확인 방법(SSoT). 키는 `기관 slug/목록 slug`. 규칙 설명: docs/project/service/service-03-curated-lists.md 「6. 최신 확인」.
// kind
//   annual  — 해마다 수상작·선정작이 쌓인다. when(발표 달)이 지났는데 기대 연도의 항목이 없으면 출처(source_url)에서 새 회차를 확인한다.
//   edition — 기관이 판을 거듭 내는 목록의 한 판이다. 기관 페이지에서 더 새 판이 나왔는지 본다(새 판은 series_key로 묶은 새 목록).
//   living  — 기관이 지금도 운영하는 페이지다. 출처 페이지의 항목 전체를 DB 항목과 대조한다.
//   fixed   — 한 시점에 한 번 발표된 특집·기사다. 바뀌지 않으므로 출처 생존만 본다.
//   ended   — 끝난 상·프로그램이다. 새 회차가 없으므로 출처 생존만 본다.
// year(annual만): 항목 year가 무엇을 가리키는가. announce = 발표 연도, previous = 발표 전해(대상 작품 연도), next = 발표 다음 해(회차 표기 연도).
export const FRESHNESS_KINDS = ['annual', 'edition', 'living', 'fixed', 'ended'];

const annual = (when, year = 'announce', note = null) => ({kind: 'annual', when, year, ...(note ? {note} : {})});
const of = (kind, note = null) => ({kind, ...(note ? {note} : {})});

export const FRESHNESS = {
  // ── BOOK · 상 ──
  'booker-prize-foundation/booker-prize-winners': annual([11]),
  'booker-prize-foundation/international-booker-prize-winners': annual([5]),
  'pulitzer-prize/pulitzer-fiction-winners': annual([5]),
  'pulitzer-prize/pulitzer-history': annual([5]),
  'national-book-foundation/national-book-award-fiction': annual([11]),
  'academie-goncourt/prix-goncourt': annual([11]),
  'nihon-bungaku-shinkokai/akutagawa-prize': annual([7], 'announce', '1월·7월 두 번 발표한다. 1월 발표분(전해 하반기)은 전해 연도로 적으므로 기대 연도는 7월 기준으로만 잡고, 1월이 지나면 전해 연도에 두 번째 항목이 있는지도 본다'),
  'womens-prize/womens-prize-fiction': annual([6]),
  'baillie-gifford-prize/baillie-gifford-nonfiction': annual([11]),
  'financial-times/ft-business-book': annual([12]),
  'royal-society/royal-society-science-book': annual([9]),
  'american-library-association/newbery-medal': annual([1]),
  'american-library-association/caldecott-medal': annual([1]),
  'hugo-awards/hugo-best-novel': annual([8]),
  'sfwa/nebula-best-novel': annual([6]),
  'locus-magazine/locus-fantasy-novel': annual([6]),
  'mystery-writers-of-america/edgar-best-novel': annual([5]),
  'crime-writers-association/cwa-gold-dagger': annual([7]),
  'horror-writers-association/bram-stoker-novel': annual([6], 'previous', '6월 시상식의 상은 전해 작품 연도(「2025 Bram Stoker Award」)로 부른다'),
  'romance-writers-of-america/rita-award-romance': of('ended', '협회가 2019년을 끝으로 폐지했다'),
  'chosun-ilbo/dongin-literary-award': annual([11]),
  'munhaksasang/yi-sang-literary-award': annual([2]),
  'hyundae-munhak/hyundae-munhak-award-fiction': annual([12], 'next', '12월 발표분을 다음 해 회차 연도로 적는다'),
  'hankook-ilbo/korea-publication-award': annual([12]),
  // ── BOOK · 대학 신입생 도서(해마다 선정) ──
  'princeton-university/princeton-pre-read': annual([5]),
  'stanford-university/stanford-three-books': annual([6]),
  'duke-university/duke-common-experience': annual([6]),
  'cornell-university/cornell-new-student-reading': of('ended', '2015년을 끝으로 프로그램이 끝났다'),
  'tsinghua-university/tsinghua-president-gift-books': of('ended', '치우융 총장 재임기(2015~2021)로 끝났다'),
  'university-of-tokyo-press/utokyo-professors-freshman-books-2026': of('edition', '『UP』 4월호 연례 설문. 새 해 판은 새 목록으로 series_key에 묶는다'),
  // ── BOOK · 대학 권장도서 ──
  'seoul-national-university/snu-recommended-100': of('edition', '2005년판. 개정판 발표 없음(26.11.23 확인)'),
  'university-of-seoul/uos-books-of-our-time-100': of('edition', '2017년 3월 확정판. 개정 발표 없음(26.11.23 확인). 도서관 「시대가 읽는 책 100선 코너」 소장본은 공식 목록과 다르다'),
  'postech/postech-recommended-100': of('edition', '2017년 4월판(보관본). 현행 페이지는 없어졌고 새 판 발표 없음(26.11.23 확인)'),
  'hanyang-university/hanyang-recommended-76': of('edition', '2015년판(76선). 도서관 「한양인 권장도서 (2009~2026)」에 2026년판 87선이 있고 목록이 크게 바뀌었다(26.11.23 확인). 2026년판을 새 목록으로 만들어 series_key로 묶어야 한다'),
  'kaist/kaist-recommended-100': of('edition', '2010년 독서마일리지 보관본. 도서관에 「독서문화위원회 추천도서(2021~)」 101권이 따로 있다(26.11.23 확인). 새 목록으로 만들지 정해야 한다'),
  'cambridge-philosophy/cambridge-philosophy-reading': of('edition', '학과 PDF(2023년 7월 갱신). 더 새 PDF를 본다'),
  'chung-ang-university/cau-humanities-reading': of('living'),
  'korea-university/korea-recommended-100': of('living'),
  'korea-university/korea-classics-thought-20': of('living'),
  'korea-university/korea-classics-fiction-30': of('living'),
  'korea-university/korea-dept-recommended': of('living'),
  'yonsei-university/yonsei-must-reads-200': of('living'),
  'sungkyunkwan-university/skku-classic-100': of('living'),
  'sogang-university/sogang-required-230': of('living'),
  'inha-university/inha-jungseok-100': of('living'),
  'st-johns-college/st-johns-great-books': of('living', '학년별 강독 목록. 해마다 손볼 수 있다'),
  'columbia-university/columbia-literature-humanities': of('living', '학년도마다 강의계획서가 바뀐다'),
  'columbia-university/columbia-contemporary-civilization': of('living', '학년도마다 강의계획서가 바뀐다'),
  // ── BOOK · 언론·특집(한 번 발표) ──
  'bbc/bbc-big-read-top-100': of('fixed'),
  'bbc/bbc-100-novels-shaped-our-world': of('fixed'),
  'bokklubben/bokklubben-world-library-100': of('fixed'),
  'new-york-times/nyt-100-best-books-21st-century': of('fixed'),
  'modern-library/modern-library-100-novels': of('fixed'),
  'time-magazine/time-100-novels': of('fixed'),
  'the-guardian/guardian-100-best-books-21st-century': of('fixed'),
  'the-guardian/guardian-100-best-nonfiction-books': of('fixed'),
  'the-guardian/guardian-100-best-novels': of('fixed'),
  'le-monde/le-monde-100-books-of-the-century': of('fixed'),
  'cnn/cnn-most-influential-books-of-the-decade': of('fixed'),
  'npr/npr-top-100-sf-fantasy': of('fixed'),
  'british-psychological-society/bps-psychology-books': of('fixed', '『The Psychologist』 연재 설문을 모은 것'),
  // ── VIDEO ──
  'academy-awards/academy-best-picture': annual([3], 'previous', '3월 시상식을 대상 작품 연도로 적는다'),
  'cannes-film-festival/cannes-palme-dor': annual([5]),
  'venice-film-festival/venice-golden-lion': annual([9]),
  'blue-dragon-film-awards/blue-dragon-best-film': annual([11]),
  'american-film-institute/afi-100-years-100-movies': of('fixed'),
  'bbc-culture/bbc-greatest-comedies': of('fixed'),
  'time-out/timeout-100-horror-films': of('fixed'),
  'sight-and-sound/sight-and-sound-greatest-films-2022': of('edition', '10년마다 나오는 설문. 다음 판은 2032년'),
  // ── GAME ──
  'golden-joystick-awards/golden-joystick-ultimate-game-of-the-year': annual([11]),
  'the-game-awards/tga-game-of-the-year': annual([12]),
  'bafta/bafta-best-game': annual([4]),
  'academy-of-interactive-arts-and-sciences/dice-game-of-the-year': annual([2]),
  'game-developers-choice-awards/gdca-game-of-the-year': annual([3]),
  // ── MUSIC ──
  'korean-music-awards/korean-music-awards-album-of-the-year': annual([2]),
  'recording-academy/grammy-album-of-the-year': annual([2]),
  'brit-awards/brit-awards-album-of-the-year': annual([3]),
  'mercury-prize/mercury-prize-album-of-the-year': annual([10]),
  'latin-recording-academy/latin-recording-academy-album-of-the-year': annual([11]),
  'gramophone-awards/gramophone-awards-recording-of-the-year': annual([10]),
};

// annual 목록에 오늘 기준으로 있어야 할 가장 최근 연도. 발표 달이 이번 달이면 아직 발표 전일 수 있어 due로 따로 표시한다.
export function expectedLatest(entry, today = new Date()) {
  const y = today.getFullYear(), m = today.getMonth() + 1, shift = {announce: 0, previous: -1, next: 1}[entry.year];
  const past = entry.when.filter(w => w < m), due = entry.when.includes(m);
  const announceYear = past.length ? y : y - 1;
  return {year: announceYear + shift, due, dueYear: y + shift};
}
