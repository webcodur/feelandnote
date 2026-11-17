import crypto from 'node:crypto';
import {UNIFIED_ARTICLE} from './unified-article.mjs';
import {formattedPlainText} from './formatted-text.mjs';
import {READING_WAY_STYLE} from './reading-way-section.mjs';

// 구획 전용 글자색. 「왜 주는 상인가」는 인물 글의 「독서 방식」과 같은 자리(대상의 핵심)라 같은 갈색 계열을 쓴다.
// 본문 안의 강조(따옴표·책 괄호)는 formatted-text.mjs가 남색으로 바꾼다. 작품의 부커상에서의 위치 줄(position)은 감상 배경과 같은 초록을 쓴다(26.11.15 사용자 지시).
export const GUIDE_TONES = Object.freeze({purpose: Object.freeze({title: READING_WAY_STYLE.titleColor, body: READING_WAY_STYLE.bodyColor})});

// 기관 글(목록 안내서) 원고. 통합 원고와 같은 부품 목록(operations)을 내보내 같은 편집기 입력·검증 도구가 받는다.
// 구획은 고정 골격 없이 원고 재료가 정한다. 재료(출처를 대조한 사실)만 넘기고 구획·순서·사진 배치는 AGY가 플랫폼과 독자에 맞게 짠다(26.11.15 사용자 지시).
// 사전식 골격(운영 기관·시상식장·선정 방식)이 연표 나열을 불러 반려됐다. 글자 크기는 UNIFIED_ARTICLE.font를 따른다.
// 이미지 규격: 로고 360, 장소는 본문 폭 1:1, 인물은 아바타 규격 얼굴 크롭 240, 표지 200.
// 장소 680: 편집기는 693(본문 꽉 찬 폭)부터 정렬 단추를 없애고 왼쪽 정렬로 둔다. 가운데 정렬이 남는 최대 폭으로 쓴다.
export const CURATED_GUIDE = Object.freeze({
  version: 'curated-guide-1',
  // 구획 제목(목차 항목)은 짧은 명사형으로 쓴다. 문장형 제목이 목차에 거듭 올라와 반려됐다(26.11.15 사용자 지시: 「부커상 / 창시자 / 운영기관」처럼).
  titleMax: 12,
  // strip: 나란히 묶는 사진의 입력 폭. 작게 넣어야 끌어 붙일 때 대상이 한 화면에 들어온다. 묶은 뒤 표시 폭은 편집기가 정한다.
  width: Object.freeze({logo: 360, place: 680, person: 240, cover: UNIFIED_ARTICLE.coverWidth, strip: 200, tile: 340, pair: 460, avatar: UNIFIED_ARTICLE.avatarWidth}),
  // tile: 관련 이미지 낱장이 줄에 혼자 남을 때의 폭. 나란히 2장 한 칸과 비슷한 크기로 보이게 본문 폭의 절반으로 둔다.
  // 주목할 만한 리뷰에 싣는 인물 감상의 최대 글자 수. 기관 글 중간에 수천 자짜리 감상(빌 게이츠·존 그린)이 끼면 흐름이 끊긴다(26.11.16 사용자 지시).
  // 실측 분포: 중간값 179자, 상위 10% 386자, 가장 긴 일반 감상 743자, 빌 게이츠·존 그린의 긴 감상 2,110~6,904자.
  reviewMaxChars: 1000,
});
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const httpUrl = value => { const u = new URL(value); if (!['http:', 'https:', 'file:'].includes(u.protocol)) throw Error('HTTP or local file image required'); return u.href; };
const clean = value => String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t ]{2,}/g, ' ').trim();

export function compileCuratedGuide(m) {
  if (m.kind !== 'curated' || !/^\d+$/.test(String(m.logNo))) throw Error('Exact institution post identity required');
  if (!clean(m.title) || !clean(m.name)) throw Error('Title and name required');
  for (const u of [m.serviceUrl, m.linkUrl]) if (new URL(u).origin !== 'https://feelandnote.com') throw Error('Service origin differs');
  // sections: [{title, purpose, blocks}] 순서대로. purpose는 상이 왜 있는지를 푸는 구획 하나에만 둔다(GUIDE_TONES.purpose 글자색).
  if (!Array.isArray(m.sections) || !m.sections.length || m.sections.some(s => !clean(s.title) || !s.blocks?.length)) throw Error('Every guide section needs a title and content');
  if (m.sections.filter(s => s.purpose).length > 1) throw Error('Only one purpose section');
  for (const s of m.sections) if (clean(s.title).length > CURATED_GUIDE.titleMax || /[다요까]$/.test(clean(s.title))) throw Error('Section title must be a short noun phrase: ' + s.title);
  const sections = m.sections.map((s, i) => ({no: i + 1, title: clean(s.title), purpose: !!s.purpose}));

  const ops = [];
  let strips = 0;
  const text = (value, role, align, extra = {}) => {
    const body = role === 'body';
    ops.push({kind: 'text', text: body ? formattedPlainText(clean(value)) : clean(value), role, align, ...(body ? {formattedText: true, bold: true} : {}), ...extra});
  };
  const link = (value, href, role = 'label', extra = {}) => ops.push({kind: 'link', text: clean(value), href: new URL(href).href, role, align: 'center', ...extra});
  // 구획·작품 제목 다음 첫 문단도 한 줄 띄운다(제목에 붙으면 답답하다는 26.11.15 사용자 지적). 붙여 두는 것은 표 위 안내(label) 다음뿐이다.
  const afterHeading = () => ops.at(-1)?.role === 'label' && ops.at(-1)?.kind === 'text' && !ops.at(-1)?.placement;
  let tone = null;
  const paragraph = (value, color = null) => text(value, 'body', 'left', {gapBefore: !afterHeading(), ...(color ? {color} : {})});
  const image = (b, kind) => {
    if (!clean(b.name)) throw Error('Image name required');
    const url = httpUrl(b.url);
    if (url.startsWith('file:') && !/^[a-f0-9]{64}$/.test(b.sha256 ?? '')) throw Error('Local image hash required: ' + b.name);
    ops.push({kind: 'image', url, width: b.width ?? CURATED_GUIDE.width[kind], role: kind === 'person' ? 'portrait' : kind, name: clean(b.name), ...(b.sha256 ? {sha256: b.sha256} : {})});
    if (b.caption) {
      const caption = {placement: 'cover-caption', role: 'label', align: 'center', bold: true, gapBefore: false};
      if (b.captionHref) link(b.caption, b.captionHref, 'label', caption); else ops.push({kind: 'text', text: clean(b.caption), ...caption});
    }
  };
  const block = b => {
    if (b.p) return paragraph(b.p, tone?.body);
    // 구획 안내문(무엇을 골랐는지·표 읽는 법). 본문과 같은 글씨로 가운데에 둔다(26.11.16 사용자 지시).
    if (b.guide) return text(b.guide, 'body', 'center', {gapBefore: !afterHeading(), ...(tone?.body ? {color: tone.body} : {})});
    // 표 위 안내(회색 글씨 뜻 등). 인물 전체 목록의 안내와 같은 모양이다.
    if (b.note) return text(b.note, 'label', 'center', {gapBefore: true});
    // 작품 제목 줄. 인물 글의 책 제목처럼 가운데 소제목으로 둔다.
    // 주목할 만한 리뷰: 안내서로 바뀌기 전 글의 「소개 책 + 인물 리뷰」를 같은 모양으로 되살린다(26.11.16 사용자 지시).
    // 책 소개는 옛 글의 검수 통과 문장, 리뷰는 현재 DB 감상 원문 그대로다. 주목작이기도 하면 YES24 줄 아래 위치 줄을 둔다.
    if (b.reviewBook) {
      const v = b.reviewBook, paras = t => String(t).split(/\n{2,}/).map(clean).filter(Boolean);
      if (!clean(v.heading) || !v.coverUrl || !paras(v.intro).length || !Array.isArray(v.readers)) throw Error('Review book needs title, cover, introduction and readers: ' + v.heading);
      text(v.heading, 'heading', 'center', {gapLines: 2});
      if (clean(v.creator)) text(v.creator, 'author', 'center');
      // 표지와 그 책을 읽은 인물의 대표 사진을 한 장으로 합쳐 넣는다(26.11.16 사용자 지시: 책마다 인물 한 명, 표지 옆에 바로 붙인다).
      // 편집기 사진 묶음은 PC에서 가로폭을 꽉 채워 과하므로 쓰지 않고, 합친 사진을 CURATED_GUIDE.width.pair 폭으로 둔다.
      const first = v.readers[0];
      if (!first) image({name: v.title + ' 표지', url: v.coverUrl, caption: v.caption, captionHref: v.captionHref}, 'cover'); // 감상이 없는 주목작은 표지만
      else {
        if (!v.pairUrl) throw Error('Cover-reader pair image required: ' + v.heading);
        image({name: v.title + ' 표지와 ' + first.name, url: v.pairUrl, sha256: v.pairSha256, width: CURATED_GUIDE.width.pair, caption: v.caption, captionHref: v.captionHref}, 'tile');
      }
      if (v.position) text(v.position, 'body', 'center', {color: UNIFIED_ARTICLE.reviewColor, gapBefore: false});
      // 「책 소개」「감상 배경」 머리말은 주목작 위치 줄처럼 가운데 한 줄로 따로 두고, 한 줄 띄워 본문을 잇는다(26.11.16 사용자 지시).
      paras(v.intro).forEach(p => text(p, 'body', 'left', {gapBefore: true}));
      for (const n of v.readers) {
        if (!clean(n.review) || !n.source_url || !n.avatar_url || !clean(n.name)) throw Error('Reader review, source and avatar required: ' + v.heading);
        if (clean(n.review).length > CURATED_GUIDE.reviewMaxChars) throw Error(`Reader review too long for a guide (${clean(n.review).length} > ${CURATED_GUIDE.reviewMaxChars}): ${n.name} — ${v.heading}`);
        if (n !== first) image({name: n.name, url: n.avatar_url}, 'avatar');
        text([clean(n.title), clean(n.name)].filter(Boolean).join(' ') + '의 감상', 'body', 'center', {gapBefore: true}); // 책 소개 글과 같은 크기
        paras(n.review).forEach(p => text(p, 'body', 'left', {color: UNIFIED_ARTICLE.reviewColor, gapBefore: true}));
        link('감상 근거', n.source_url, 'label', {align: 'right', gapBefore: true}); // 인물 글과 같은 작은 글씨(label)
      }
      link('작품 상세', 'https://feelandnote.com/content/' + v.content_id + '?category=book', 'label', {align: 'right', gapBefore: !v.readers.length}); // 감상 근거 바로 아래 줄에 붙인다(26.11.17 사용자 지시)
      return;
    }
    // 작품의 부커상에서의 위치 한 줄. 본문 크기, 감상 배경 색(UNIFIED_ARTICLE.reviewColor)으로 가운데 둔다.
    // 사진 설명 칸(YES24)에는 아래 여백이 있어 빈 줄을 더하면 두 줄로 보인다. 위치 줄은 빈 줄 없이 붙인다(26.11.15 사용자 지적).
    if (b.position) return text(b.position, 'body', 'center', {color: UNIFIED_ARTICLE.reviewColor, gapBefore: false});
    if (b.bookTitle) return text(b.bookTitle, 'heading', 'center', {gapLines: 2});
    if (b.lead) return text(b.lead, 'heading', 'left', tone ? {color: tone.title} : {});
    if (b.image) { if (!['place', 'person', 'cover', 'tile', 'avatar'].includes(b.image)) throw Error('Image kind differs'); return image(b, b.image); }
    // 사진 묶음: 2~3장은 편집기에서 나란히 묶고(strip 번호), 1장이면 단독 사진으로 둔다. 설명은 달지 않는다.
    if (b.strip) {
      if (!b.strip.length || b.strip.length > 3) throw Error('Strip holds 1-3 images');
      const id = b.strip.length > 1 ? 'strip-' + ++strips : null;
      for (const s of b.strip) { image({...s, caption: null}, 'strip'); if (id) ops.at(-1).strip = id; }
      return;
    }
    if (b.table) {
      const {columns, rows, widths, mutedRows} = b.table;
      if (!columns?.length || !rows?.length || rows.some(r => r.length !== columns.length)) throw Error('Table width differs');
      if (mutedRows?.some(i => !Number.isInteger(i) || i < 0 || i >= rows.length)) throw Error('Muted row outside the table');
      return ops.push({kind: 'table', columns: columns.map(clean), rows: rows.map(r => r.map(c => clean(String(c)))), ...(widths ? {widths} : {}), ...(mutedRows?.length ? {mutedRows: [...mutedRows]} : {})});
    }
    throw Error('Unknown guide block: ' + JSON.stringify(b).slice(0, 80));
  };

  // 링크 한 줄만 따로 붙여 넣으면 편집기가 링크 미리보기 카드로 바꾼다. 이름과 한 번에 붙도록 로고보다 앞에 둔다.
  link(m.topLink, m.linkUrl);
  text(m.name, 'heading', 'center');
  image({...m.logo, caption: null}, 'logo');
  ops.at(-1).role = 'logo';
  // 목차 위 소개는 두지 않는다. 첫 구획이 상의 이야기를 처음부터 하므로 소개가 그 첫머리를 되풀이한다(26.11.15 사용자 지시).
  if (m.intro) throw Error('Guide introduction above the contents is not used');
  ops.push({kind: 'divider'});
  text('목차', 'heading', 'center');
  // 목차·구획 제목에는 번호를 달지 않는다. 번호는 구획 안 작품 목록(주목할 만한 작품)에만 쓴다(26.11.15 사용자 지시).
  for (const s of sections) ops.push({kind: 'text', text: s.title, role: 'body', align: 'left', quote: 'contents'});
  for (const [i, s] of sections.entries()) {
    ops.push({kind: 'divider'});
    // 구분선은 위 문단에 붙고 아래 새 구획과는 조금 떨어져 보이게, 구획 제목 앞 빈 줄을 둘로 둔다(26.11.15 사용자 지시).
    tone = s.purpose ? GUIDE_TONES.purpose : null;
    text(s.title, 'heading', 'center', {gapLines: 2, ...(tone ? {color: tone.title} : {})});
    for (const b of m.sections[i].blocks) block(b);
  }
  ops.push({kind: 'divider'});
  text(m.closing, 'body', 'center', {gapBefore: true});
  link(m.closingLink, m.linkUrl, 'body', {bold: true, gapBefore: true});

  const article = {version: CURATED_GUIDE.version, policyHash: digest({...CURATED_GUIDE, sections}), logNo: String(m.logNo), kind: 'curated', title: clean(m.title), serviceUrl: new URL(m.serviceUrl).href, operations: ops, sources: [], sourceHash: digest(m)};
  return {...article, articleHash: digest(article)};
}
