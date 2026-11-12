// 인물 글의 「전체 감상 목록」 구획: 공개 감상 책 전권을 번호·제목·저자 표로 보여 주고,
// 국내에서 읽을 수 없는 책(번역서 없음·절판)은 같은 표의 뒤쪽에 두고 회색 글씨로 구별한다.
// 조립기(unified-article)·삽입기(apply-person-full-list)·미리보기가 이 모듈 하나를 쓴다.

export const PERSON_FULL_LIST = Object.freeze({
  heading: '전체 감상 목록',
  anchor: 'full-list',
  columns: Object.freeze(['번호', '제목', '저자']),
  legend: '회색 글씨는 번역서가 없거나 절판된 책입니다.',
  // 판형 개편 전 두 표 구획의 라벨. 기존 글에서 걷어낼 때만 쓴다.
  legacyLabels: Object.freeze(['국내에서 읽을 수 있는 책 · ', '번역서가 없거나 절판된 책 · ']),
  widths: Object.freeze(['12%', '58%', '30%']),
  headerBackground: '#eeeeee',
  mutedColor: '#aaaaaa',
});

// 서비스 제목 배지(sw/web/src/lib/utils/content-locale.ts resolveTitleBadge)와 같은 기준이다.
// 표시용 제목 행(primary=none + 표기 표식)은 판본이 아니고, availability=out_of_print는 절판이다.
const DISPLAY_TITLE_MARKS = new Set(['translated', 'romanized', 'original']);
const isDisplayTitleRow = sources => sources?.primary === 'none' && DISPLAY_TITLE_MARKS.has(sources?.title);
export function readableInKorean(ko) {
  if (!ko?.title?.trim()) return false;
  if (ko.sources?.availability === 'out_of_print') return false;
  return !isDisplayTitleRow(ko.sources);
}

// 국내판이 없는 책은 실제 원서 판본(영어 행)이 있으면 그 제목·저자로 적어 찾을 수 있게 한다.
function displayName(book) {
  const en = book.en, useOriginal = !readableInKorean(book.ko) && book.ko?.sources?.availability !== 'out_of_print' && en?.title?.trim() && !isDisplayTitleRow(en.sources);
  const row = useOriginal ? en : book.ko ?? en;
  if (!row?.title?.trim()) throw Error('Book title required for the full list: ' + book.content_id);
  return { title: row.title.trim().replace(/\s+/g, ' '), creator: (row.creator ?? '').trim().replace(/\s+/g, ' ') };
}

// books: [{content_id, ko, en}] — 공개 FINISHED 감상 관계의 BOOK 전부. featuredIds: 본문 소개 순서.
export function personFullList(books, featuredIds = []) {
  if (new Set(books.map(b => b.content_id)).size !== books.length) throw Error('Duplicate full-list book');
  const rank = id => { const i = featuredIds.indexOf(id); return i < 0 ? Infinity : i; };
  const named = books.map(b => ({ ...b, ...displayName(b), readable: readableInKorean(b.ko) }));
  named.sort((a, b) => rank(a.content_id) - rank(b.content_id) || a.title.localeCompare(b.title, 'ko') || String(a.content_id).localeCompare(String(b.content_id)));
  const groups = { available: named.filter(b => b.readable), unavailable: named.filter(b => !b.readable) };
  let n = 0;
  const rows = list => list.map(b => [String(++n), b.title, b.creator]);
  return { columns: [...PERSON_FULL_LIST.columns], available: rows(groups.available), unavailable: rows(groups.unavailable), contentIds: [...groups.available, ...groups.unavailable].map(b => b.content_id) };
}

// 구획 연산(앞 구분선 제외). 표는 하나이고, 국내판 없는 책이 있으면 표 위에 회색 글씨 안내를 둔다.
export function personFullListSection(list) {
  if (!list?.available || !list?.unavailable || !(list.available.length + list.unavailable.length)) throw Error('Complete person full list required');
  const ops = [{ kind: 'text', text: PERSON_FULL_LIST.heading, role: 'heading', align: 'center', anchor: PERSON_FULL_LIST.anchor }];
  if (list.unavailable.length) ops.push({ kind: 'text', text: PERSON_FULL_LIST.legend, role: 'label', align: 'center', gapBefore: true });
  ops.push({ kind: 'table', group: 'person', columns: [...list.columns], rows: [...list.available, ...list.unavailable].map(r => [...r]), muted: list.unavailable.length });
  return ops;
}

const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// 기관 「전체 선정 목록」 표의 열 너비. 연도·순위 같은 첫 열은 가운데 정렬한다.
export const CURATED_LIST_WIDTHS = Object.freeze({ 2: Object.freeze(['66%', '34%']), 3: Object.freeze(['16%', '52%', '32%']) });
const centeredFirstColumn = op => op.group === 'person' || /^(연도|순위|번호|년도|회차)$/.test(op.columns?.[0] ?? '');
// 네이버 편집기에 붙여 넣을 목록 표(인물 전체 감상 목록·기관 전체 선정 목록). 뒤쪽 muted 줄은 회색 글씨다.
export function listTableHtml(op) {
  const firstMuted = op.rows.length - (op.muted ?? 0), center = centeredFirstColumn(op);
  const widths = op.group === 'person' ? PERSON_FULL_LIST.widths : CURATED_LIST_WIDTHS[op.columns.length] ?? op.columns.map(() => Math.floor(100 / op.columns.length) + '%');
  const cell = (value, column, row) => {
    const header = row < 0, muted = row >= firstMuted, text = escape(value);
    return `<td style="border:1px solid #ccc;padding:8px;width:${widths[column]};${header ? 'background-color:' + PERSON_FULL_LIST.headerBackground + ';' : ''}${column === 0 && center ? 'text-align:center;' : ''}">${header ? '<strong>' + text + '</strong>' : muted ? '<span style="color:' + PERSON_FULL_LIST.mutedColor + '">' + text + '</span>' : text}</td>`;
  };
  const rows = [op.columns, ...op.rows].map((row, i) => '<tr>' + row.map((value, column) => cell(value, column, i - 1)).join('') + '</tr>').join('');
  return `<table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>`;
}
export const personFullListTableHtml = listTableHtml;
