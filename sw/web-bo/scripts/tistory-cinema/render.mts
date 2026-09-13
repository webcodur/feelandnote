/**
 * 원고 재료(JSON) → 티스토리 본문 HTML.
 *
 * 티스토리 에디터는 HTML 모드를 지원한다. 네이버처럼 한 줄씩 쳐 넣고 정렬을 좌표로
 * 클릭할 필요가 없다 — 가운데 정렬·강조·목차·표를 HTML 로 정확히 못 박는다.
 * 네이버에서 「가로선이 왼쪽으로 기울어도 그냥 뒀다」는 지적을 받은 자리가 여기서는 없다.
 *
 * 검색 설계: 우리만 가진 것은 「누가 꼽았나」지만, 「대부 줄거리」·「대부 평점」·「대부 출연진」
 * 으로 오는 사람이 훨씬 많다. 그 정보를 실제로 담아 두면 그 검색어를 받으면서도 이탈하지
 * 않는다. 없는 정보를 제목에만 넣는 짓(「…리뷰」)은 하지 않는다 — 들어와서 없으면 바로 나간다.
 */

export type Picked = { slug: string; nickname: string; profession: string | null; title: string | null; review: string; source?: string | null
                       headline?: string | null; bio?: string | null; avatar_url?: string | null }
export type Material = {
  work: { id: string; title: string; poster: string | null; creator: string | null; release: string | null }
  tmdb: { runtime?: number; vote?: number; voteCount?: number; genres?: string[]; overview?: string; original?: string
          cast?: { name: string; role: string }[]; director?: string[]; release?: string | null
          trailer?: { key: string; name: string } | null; trailers?: { key: string; name: string; type: string }[] }
  total: number
  usable?: number
  picked: Picked[]
  alsoLiked?: { id: string; title: string; n: number }[]
  profCount?: Record<string, number>
  /**
   * 제목 앞에 세울 **이 영화가 어떤 영화인지** 한 줄. `headlines.json` 이 쥐고
   * `preview.mts` 가 작품 이름으로 찾아 넣는다. 없으면 옛 제목 형식으로 돌아간다.
   */
  headline?: string | null
}

const PROF: Record<string, string> = {
  director: '감독', actor: '배우', musician: '음악가', athlete: '운동선수', entrepreneur: '기업가',
  humanities_scholar: '학자', social_scientist: '학자', natural_scientist: '학자', scientist: '학자',
  author: '작가', poet: '작가', influencer: '크리에이터', investor: '투자자',
  politician: '정치인', leader: '정치인', commander: '군인', visual_artist: '예술가', other: '',
}
/** 한글 받침에 맞춰 조사를 고른다. 「대부을」 같은 글이 나가면 그 한 줄에서 신뢰를 잃는다. */
const josa = (word: string, withBatchim: string, without: string) => {
  const last = word.replace(/[』」\]\)]+$/, '').slice(-1)
  if (/\d/.test(last)) return /[013678]/.test(last) ? withBatchim : without
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return without
  return (code - 0xac00) % 28 ? withBatchim : without
}
const eul = (w: string) => josa(w, '을', '를')
const eun = (w: string) => josa(w, '은', '는')
const ga = (w: string) => josa(w, '이', '가')
const wa = (w: string) => josa(w, '과', '와')
/** 「…로/으로」. 받침이 ㄹ이면 「로」다. */
const ro = (w: string) => {
  const last = w.replace(/[』」\]\)]+$/, '').slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '로'
  const jong = (code - 0xac00) % 28
  return jong === 0 || jong === 8 ? '로' : '으로'
}

/**
 * 판본 표기를 제목에서 걷는다. `content_locales.title` 에 「그린 북[Blu-ray]」처럼 상품명이
 * 섞여 들어온 것이 있다. DB 를 고치는 것은 별건이고, 글에는 작품명만 싣는다.
 */
const cleanTitle = (t: string) =>
  t.replace(/\s*[\[(]\s*(Blu-?ray|DVD|4K|UHD|블루레이|디비디)[^\])]*[\])]/gi, '').trim()

/**
 * 제목 길이 예산. 티스토리 목록은 496px 에서 자르고 구글은 그보다 짧게 자른다. 26.09.05에
 * 9편 중 8편이 「…」로 잘렸다(594~626px). 온전히 보인 박찬욱 편이 31자·391px 이었다.
 *
 * 앞머리는 그대로 두고 **부제를 예산 안에서 채울 수 있는 만큼만** 붙인다. 잘릴 바에는
 * 짧게 끝내는 편이 낫다 — 잘린 부제는 클릭을 부르지 못하고 자리만 먹는다.
 */
/**
 * 🔴 **「꼽았다」·「인생 영화」로 제목을 짓지 않는다.** DB 에 있는 것은 **감상 기록**이지
 * 추천이 아니다(26.09.05). 「인생 영화로 꼽았다」고 실제로 말한 사람도 있지만 그것은 그
 * 사람의 원문이고, 우리가 기록 전체를 그렇게 부르면 없는 말을 지어내는 셈이다.
 * 제목과 본문 뼈대는 **「감상한」**으로 쓰고, 추천 프레임은 **태그**에만 남긴다
 * (`인생영화`·`영화추천`·`추천영화`).
 */
export const TITLE_MAX = 36
/**
 * 부제는 **둘 이상 들어갈 때만** 붙인다. 하나만 남으면 「『택시 드라이버』… | 탑」처럼
 * 초라해져 안 붙이느니만 못하다. 한 글자짜리 이름(그룹명 등)도 대표로 세우지 않는다.
 */
function fitTitle(head: string, parts: string[], max = TITLE_MAX) {
  const sub: string[] = []
  for (const p of parts.filter((x) => x.length >= 2)) {
    const next = [...sub, p]
    if (`${head} | ${next.join('·')}`.length <= max) sub.push(p)
  }
  return sub.length >= 2 ? `${head} | ${sub.join('·')}` : head
}

/** 후보를 긴 것부터 훑어 예산에 드는 첫 번째를 쓴다. 목록 편처럼 앞머리가 긴 글에 쓴다. */
function pickTitle(cands: string[], max = TITLE_MAX) {
  return cands.find((c) => c.length <= max) ?? cands[cands.length - 1]
}

/**
 * 🔴 티스토리 스킨은 `p`·`h2` 의 기본 마진을 죽인다. 글이 한 덩어리로 붙어 읽기 어려워져
 *    26.09.05에 지적을 받았다. 여백을 **인라인으로 못 박는다** — 스킨을 바꿔도 안 흔들린다.
 */
/**
 * 🔴 **`margin` 으로는 문단이 안 벌어진다.** 티스토리 스킨이 `p { margin:0 !important }` 로
 *    덮어 인라인 스타일까지 이긴다. 26.09.05에 올린 글의 문단을 재 보니 `margin-bottom` 이
 *    computed 로 0px 이었다 — 편집기에는 값이 그대로 남아 있는데도 화면에서 죽었다.
 *
 *    여백은 **패딩으로 준다.** 스킨은 대개 `margin` 만 초기화하므로 `padding` 은 살아남는다.
 *    카드·표처럼 자체 배경이 있는 블록은 패딩을 안쪽 여백으로 이미 쓰므로, 바깥을 `gap()`
 *    으로 한 겹 감싸 그 래퍼에 아래 여백을 준다.
 */
/**
 * 🔴 스킨은 `p` 의 **margin 과 padding 을 모두** 초기화한다. 인라인 스타일도 진다.
 *    26.09.05에 margin → padding 으로 바꿔 봤지만 둘 다 computed 0px 이었다.
 *    인라인 + `!important` 는 어떤 스타일시트도 이기지 못한다. 여기서만 쓴다.
 */
const P_STYLE = 'margin:0 !important;padding:0 0 20px !important;line-height:1.9;'
const para = (html: string) => `<p style="${P_STYLE}">${html}</p>`

/**
 * 절과 절 사이의 가로줄.
 *
 * 예전에는 `h2` 의 `border-top` 이 그 역할을 했는데, 선 아래 34px·위 0px 이라 **선이 앞
 * 문단에서 멀고 다음 제목에 붙어** 어느 쪽에 속한 선인지 알기 어려웠다. 선은 **끝난 글에
 * 가깝게** 긋고 다음 절은 넉넉히 띄워 시작한다(위 12px · 아래 56px). 아래를 32px 로
 * 잡았더니 「개행 다수 박아라」는 말을 다시 들었다 — 절이 바뀐 것이 보이려면 문단 간격
 * (20px)의 두 배는 넘어야 한다.
 *
 * `hr` 대신 `div` 두 겹을 쓴다 — 스킨이 `hr` 을 제 스타일로 덮고 `margin` 을 죽인다.
 */
const RULE = '<div style="margin:0 !important;padding:12px 0 56px !important;">'
  + '<div style="border-top:1px solid #e5e5e5;height:0;font-size:0;line-height:0;"></div></div>'

/** 감상문은 어디서나 초록이다. 본문 서술과 남의 말을 색으로 가른다. */
const REVIEW_COLOR = '#1a7f4b'

const h2 = (id: string, text: string, center = false) =>
  `${RULE}<h2 id="${id}" style="margin:0 !important;padding:0 0 16px !important;font-size:21px;line-height:1.45;${center ? 'text-align:center;' : ''}">${text}</h2>`
const h3 = (text: string, id?: string) =>
  `<h3${id ? ` id="${id}"` : ''} style="margin:0 !important;padding:24px 0 10px !important;font-size:17px;">${text}</h3>`

/**
 * 목차. **절마다 번호를 매기고 하위 절은 1-1 꼴로 잇는다.** 번호가 없으면 지금 몇 번째
 * 절을 읽고 있는지 알 수 없고, 긴 글에서 되돌아오기도 어렵다. 목차와 본문 제목은 같은
 * 문자열을 쓴다 — 따로 적으면 한쪽만 고쳐 어긋난다.
 */
type Sec = { id: string; label: string; subs?: { id: string; label: string }[] }
const toc = (secs: Sec[]) => {
  const li = (href: string, text: string) =>
    `<li style="padding:3px 0;"><a href="#${href}" style="color:#333;">${text}</a></li>`
  const body = secs.map((sc, i) => {
    const inner = (sc.subs ?? []).map((sb, j) => li(sb.id, `${i + 1}-${j + 1}. ${sb.label}`)).join('')
    return li(sc.id, `${i + 1}. ${sc.label}`).replace('</li>',
      inner ? `<ul style="margin:0;padding:4px 0 0 16px;list-style:none;">${inner}</ul></li>` : '</li>')
  }).join('')
  return '<div style="margin:0 !important;padding:10px 0 32px !important;">'
    + '<div style="padding:20px 24px;background:#f7f7f8;border-radius:6px;">'
    + '<div style="font-weight:700;padding-bottom:8px;">목차</div>'
    + `<ul style="margin:0;padding:0;list-style:none;line-height:1.9;">${body}</ul></div></div>`
}
/** 배경·테두리가 있는 블록의 바깥 여백. 스킨이 margin 을 죽여도 이 래퍼는 남는다. */
/** 첫 문단은 늘 같은 인사로 연다. 채널의 표지이자 읽는 사람이 붙잡을 손잡이다. */
const HELLO = '안녕하세요, 필앤노트 아가톤입니다.'

const gap = (html: string, px = 26) => `<div style="margin:0 !important;padding:0 0 ${px}px !important;">${html}</div>`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/**
 * 원문에 빈 줄이 있으면 문단으로 살린다. 알렉스 퍼거슨의 388자 감상처럼 두 문단으로 쓴
 * 것이 한 덩어리로 붙어 나오면 읽기 어렵다. 원문을 고치지 않고 보이는 방식만 맞춘다.
 *
 * 🔴 `<p>` 를 **온전히 닫아서** 돌려준다. 예전에는 `</p><p …>` 로 잇기만 해 부르는 쪽이
 * `<p>` 로 감싸 주기를 기대했는데, 감싸지 않은 자리에서 여는 짝 없는 `</p>` 가 새어 나갔다.
 */
const revHtml = (t: string) =>
  esc(t).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
    .map((x, i) => `<p style="margin:0 !important;padding:${i ? 14 : 0}px 0 0 !important;color:${REVIEW_COLOR} !important;">${x}</p>`)
    .join('')

const anchor = (i: number) => `fn-${i}`

/** 인물 이름에서 링크할 사이트 주소 */
const celebUrl = (slug: string) => `https://feelandnote.com/celeb/${slug}`
const workUrl = (id: string) => `https://feelandnote.com/content/${id}`

/**
 * 인물 링크는 **버튼으로 세운다.** 이름에 밑줄만 그어 두면 본문 글자와 섞여 지나친다.
 * 이 채널의 목적은 검색에서 자리를 차지해 **사람을 사이트로 보내는 것**이므로, 나온 사람
 * 이름은 전부 눌러 볼 수 있게 만든다. 알약형에 아바타를 붙이면 누구인지도 함께 보인다.
 */
const celebBtn = (name: string, slug: string, avatar?: string | null, label?: string | null) =>
  `<a href="${celebUrl(slug)}" style="display:inline-block !important;margin:0 !important;`
  + `padding:6px 14px 6px ${avatar ? '6px' : '14px'} !important;background:#f4f4f6;`
  + `border:1px solid #e2e2e6;border-radius:999px;color:#111 !important;text-decoration:none !important;`
  + `font-size:14px;font-weight:600;line-height:1.4;vertical-align:middle;">`
  + (avatar ? `<img src="${avatar}" alt="" width="24" height="24" style="width:24px !important;height:24px !important;`
      + `border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:7px;background:#ddd;" />` : '')
  + `${esc(name)}${label ? `<span style="font-weight:400;color:#888;"> ${esc(label)}</span>` : ''}</a>`

/** 글 끝에 나온 사람들을 모아 놓는 자리. 중복은 슬러그로 거른다. */
const celebWall = (
  people: { name: string; slug: string; avatar?: string | null; label?: string | null }[],
) => {
  const seen = new Set<string>()
  const uniq = people.filter((x) => x.slug && !seen.has(x.slug) && seen.add(x.slug))
  if (!uniq.length) return ''
  return `<div style="margin:0 !important;padding:0 0 8px !important;line-height:2.6;">`
    + uniq.map((x) => celebBtn(x.name, x.slug, x.avatar, x.label)).join(' ')
    + `</div>`
}

export function renderWork(m: Material): { title: string; html: string; tags: string[] } {
  const t = cleanTitle(m.work.title)
  const year = (m.work.release ?? m.tmdb.release ?? '').slice(0, 4)
  const names = m.picked.slice(0, 6).map((p) => p.nickname).sort((a, b) => a.length - b.length)
  /**
   * 🔴 **제목이 어떤 영화인지 말하게 한다(26.09.07).** 「『라쇼몽』을 감상한 6명의 셀럽」은
   *    누가 봤는지만 말하고 무슨 영화인지는 말하지 않는다. 목록에서 이 제목을 보는 사람은
   *    그 작품을 모를 수 있고, 그러면 누가 꼽았든 누를 이유가 없다.
   *
   *    헤드라인이 있으면 **앞에** 세운다. 36자 예산 안에서 인물 이름 부제는 뒤로 밀려
   *    빠지는데, 그 교환은 의도한 것이다 — 영화가 무엇인지가 누가 봤는지보다 앞선다.
   *    헤드라인은 `headlines.json` 이 쥐고 `preview.mts` 가 넣어 준다. 없으면 옛 제목이다.
   */
  const head = (m.headline ?? '').trim()
  const title = head
    ? pickTitle([
      `${head}, 『${t}』${eul(t)} 감상한 ${m.total}명의 셀럽`,
      `${head}, 『${t}』${eul(t)} 감상한 ${m.total}명`,
      `${head}, 『${t}』`,
      `『${t}』${eul(t)} 감상한 ${m.total}명의 셀럽`,
    ])
    : fitTitle(`『${t}』${eul(t)} 감상한 ${m.total}명의 셀럽`, names)

  const L: string[] = []
  const p = (x: string) => L.push(x)
  const PL = (k: string) => PROF[k] ?? ''

  if (m.work.poster) {
    p(`<div style="margin:0 !important;padding:0 0 32px !important;"><figure style="margin:0;text-align:center;">`)
    p(`<img src="${m.work.poster}" alt="${esc(t)} 포스터" style="max-width:330px !important;width:100% !important;border:1px solid #e3e3e3;border-radius:2px;" />`)
    p(`<figcaption style="margin-top:10px;font-size:13px;color:#888;">${esc(t)}${year ? ` (${year})` : ''}${m.tmdb.director?.length ? ` · ${esc(m.tmdb.director[0])}` : m.work.creator ? ` · ${esc(m.work.creator)}` : ''}</figcaption>`)
    p(`</figure></div>`)
  }

  /**
   * 도입 — **이 글이 무엇을 하는 글인지** 먼저 알린다. 서비스 이름을 첫 문단에 던지지 않는다.
   */
  const profs = Object.entries(m.profCount ?? {}).filter(([k]) => PL(k)).sort((a, b) => b[1] - a[1])
  const nonFilm = profs.filter(([k]) => !['director', 'actor'].includes(k))
  const pair = nonFilm.slice(0, 2).map(([k]) => PL(k))
  /**
   * 「오늘 만나볼 …는 ㅁㅁㅁ입니다 → 어떤 작품인가 → 그들은 뭐라고 했을까요」 세 걸음이다.
   * 앞서 쓴 「이 글은 세 가지를 차례로 봅니다…」는 목차가 바로 아래 있어 겹쳤고, 단문을
   * 늘어놓아 읽기도 나빴다. 마지막을 물음으로 닫아 목차와 본문으로 넘긴다.
   */
  /**
   * 🔴 **도입에 제원을 늘어놓지 않는다.** 연도·감독·러닝타임·주연·평점을 한 문단에 몰아
   *    넣었더니 「이런 거면 표로 나중에 읽고 말지」라는 말을 들었다(26.09.05). 그 값은
   *    바로 아래 정보표에 전부 있다. 도입은 **왜 이 영화를 여기서 다루는지**를 말한다.
   *
   *    쓸 수 있는 각은 둘이다. 하나는 **나이 대비 평점** — 오래됐는데 아직 높다는 사실은
   *    한 문장으로 작품의 자리를 알려 준다. 다른 하나는 **우리만 가진 수** — 몇 명이 이
   *    영화를 인생작으로 꼽았는가. 둘을 한 문단에 붙인다.
   */
  const yearN = Number(year)
  const age = yearN ? new Date().getFullYear() - yearN : 0
  const vote = m.tmdb.vote ? m.tmdb.vote.toFixed(1) : ''
  const standing = vote && age >= 20
    ? `${year}년 영화니 나온 지 ${age}년이 지났는데, TMDB 평점은 아직 <b>${vote}점</b>입니다.`
    : vote ? `TMDB 평점은 <b>${vote}점</b>입니다.`
      : `${year ? `${year}년 ` : ''}작품입니다.`

  p(para(HELLO))
  p(para(`오늘 만나볼 영화는 『${esc(t)}』입니다. ${standing} 그리고 필앤노트에 모인 기록에서 이 영화를 감상한 셀럽만 <b>${m.total}명</b>입니다.`))
  /**
   * 번역투를 걷는다. 「…한 사람이 N명 있습니다」·「그들은 …했을까요」는 영어를 그대로 옮긴
   * 말이다. 주어를 덜어 내고 「…만 N명입니다」·「하나씩 보겠습니다」로 간다.
   */
  p(para(`감독과 배우는 물론이고 ${pair.length === 2 ? `${pair[0]}${wa(pair[0])} ${pair[1]}까지` : '영화를 만들지 않는 사람들까지'} 있습니다. 어디서 무슨 말을 했는지 하나씩 보겠습니다.`))

  const S_ABOUT = `『${esc(t)}』${eun(t)} 어떤 영화인가`
  const S_PEOPLE = `${m.picked.length}인의 리뷰`
  const subs: { id: string; label: string }[] = []
  if (m.tmdb.overview) subs.push({ id: 'fn-plot', label: '줄거리' })
  if (m.tmdb.trailer) subs.push({ id: 'fn-trailer', label: '예고편' })
  const secs: Sec[] = [{ id: 'fn-about', label: S_ABOUT, subs }, { id: 'fn-people', label: S_PEOPLE }]
  secs.push({ id: 'fn-wall', label: '이 글에 나온 사람들' })
  p(toc(secs))

  const no = (id: string) => `${secs.findIndex((x) => x.id === id) + 1}. `
  const subNo = (id: string) => `1-${subs.findIndex((x) => x.id === id) + 1}. `
  p(h2('fn-about', `${no('fn-about')}${S_ABOUT}`))
  p(`<div style="margin:0 !important;padding:0 0 24px !important;"><table style="width:100%;border-collapse:collapse;font-size:15px;">`)
  const row = (k: string, v: string) =>
    p(`<tr><th style="width:104px;text-align:left;padding:10px 0;border-bottom:1px solid #eee;color:#666;font-weight:500;">${k}</th><td style="padding:10px 0;border-bottom:1px solid #eee;">${v}</td></tr>`)
  if (m.tmdb.original) row('원제', esc(m.tmdb.original))
  if (m.tmdb.director?.length) row('감독', esc(m.tmdb.director.join(', ')))
  if (m.tmdb.cast?.length) row('출연', m.tmdb.cast.map((c) => /[가-힣]/.test(c.role) ? `${esc(c.name)}<span style="color:#999;">(${esc(c.role)})</span>` : esc(c.name)).join(' · '))
  const rel = m.work.release ?? m.tmdb.release
  if (rel) row('개봉', rel)
  if (m.tmdb.runtime) row('러닝타임', `${m.tmdb.runtime}분`)
  if (m.tmdb.genres?.length) row('장르', esc(m.tmdb.genres.join(', ')))
  if (m.tmdb.vote) row('평점', `<b>${m.tmdb.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB · ${(m.tmdb.voteCount ?? 0).toLocaleString()}명)</span>`)
  p(`</table></div>`)
  if (m.tmdb.overview) {
    p(h3(`${subNo('fn-plot')}줄거리`, 'fn-plot'))
    p(para(esc(m.tmdb.overview)))
  }
  if (m.tmdb.trailer) {
    p(h3(`${subNo('fn-trailer')}예고편`, 'fn-trailer'))
    /**
     * 🔴 `padding-bottom:56.25%` 반응형 상자는 쓰지 않는다. 스킨이 `padding` 을 덮으면
     *    상자만 남고 화면이 빈다(26.09.05). 폭·높이를 직접 못 박는다.
     */
    p(`<div style="margin:0 !important;padding:0 0 8px !important;">`)
    p(`<iframe src="https://www.youtube.com/embed/${m.tmdb.trailer.key}" title="${esc(t)} 예고편" width="640" height="360" frameborder="0" allowfullscreen style="width:100% !important;max-width:640px !important;height:360px !important;border:0;display:block;"></iframe>`)
    p(`</div>`)
    p(`<p style="margin:0 0 22px;font-size:13px;color:#999;">영상이 보이지 않으면 <a href="https://www.youtube.com/watch?v=${m.tmdb.trailer.key}" rel="nofollow">유튜브에서 보기</a></p>`)
  }

  p(h2('fn-people', `${no('fn-people')}${S_PEOPLE}`))
  p(para(`인터뷰와 팟캐스트, 공식 프로필에 남은 말을 <b>고치지 않고</b> 옮겼습니다. 이름을 누르면 그 사람이 본 다른 작품도 보실 수 있습니다.`))
  m.picked.forEach((r, i) => {
    const label = [PROF[r.profession ?? ''] ?? '', (r.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
    const intro = (r.headline || r.bio || '').trim()
    p(`<div style="margin:0 !important;padding:0 0 26px !important;"><div id="${anchor(i)}" style="padding:20px 22px;border-left:3px solid #222;background:#fafafa;">`)
    p(`<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;">`)
    /**
     * 아바타는 **얼굴이 분간될 만큼**은 커야 한다. 38px 로 줄였더니 누구인지 알아볼 수
     * 없었다(26.09.05). 인물 페이지의 큰 사진과는 구별되게 64px 로 둔다.
     */
    if (r.avatar_url) p(`<img src="${r.avatar_url}" alt="${esc(r.nickname)}" width="64" height="64" style="width:64px !important;height:64px !important;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#eee;" />`)
    p(`<div style="flex:1 1 auto;min-width:0;">`)
    p(`<div>${celebBtn(r.nickname, r.slug, null, label)}</div>`)
    if (intro) p(`<div style="margin-top:2px;font-size:13.5px;color:#777;line-height:1.6;">${esc(intro)}</div>`)
    p(`</div></div>`)
    p(`<div style="line-height:1.9;">${revHtml(r.review)}</div>`)
    p(`</div></div>`)
  })

  /**
   * 🔴 **「필앤노트 리뷰」 절은 걷어 냈다(26.09.06).** 121편 중 71편이 「18명 가운데 열이
   *    배우입니다」 식으로 앞 절의 인물을 다시 세고 있었다. 본문 서두가 이미 「이 영화를
   *    감상한 N명」이라 같은 말을 두 번 하는 꼴이었다.
   *    다시 넣는다면 **영화 자체를 다루는 글**이어야 한다. 인물을 세는 글은 여기 오지 않는다.
   *    함께 꼽힌 작품 한 줄은 리뷰가 아니라 사이트로 가는 통로라 남긴다.
   */
  if (m.alsoLiked?.length) {
    const list = m.alsoLiked.map((a) => `『${esc(cleanTitle(a.title))}』 ${a.n}명`).join(' · ')
    p(`<p style="${P_STYLE}font-size:14px;color:#888;">이 영화를 감상한 사람들이 함께 본 작품 — ${list}</p>`)
  }
  /**
   * 나온 사람을 **글 끝에 다시 모은다.** 본문 중간의 버튼은 읽다가 지나치기 쉽고, 다 읽고
   * 나서야 「이 사람 누구지」가 생긴다. 그 자리에 문을 놓는다.
   */
  p(h2('fn-wall', `${no('fn-wall')}이 글에 나온 사람들`))
  p(para('이름을 누르면 그 사람이 읽고 보고 들은 기록이 전부 열립니다.'))
  p(celebWall(m.picked.map((r) => ({ name: r.nickname, slug: r.slug, avatar: r.avatar_url, label: PROF[r.profession ?? ''] ?? '' }))))
  p(`<p style="${P_STYLE}color:#666;">필앤노트는 인물이 실제로 읽고 보고 들은 것을 <b>출처와 함께</b> 모읍니다. 위 발언은 모두 인터뷰·팟캐스트·공식 프로필에서 옮겼고 원문을 고치지 않았습니다.</p>`)

  const rest = m.total - m.picked.length
  p(`<div style="margin:0 !important;padding:12px 0 !important;"><div style="padding:28px 22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<img src="https://feelandnote.com/icon.png" alt="필앤노트" style="width:52px !important;height:52px !important;border-radius:12px;margin-bottom:14px;" />`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:8px;">나머지 ${rest}명은 필앤노트에서</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:18px;">누가 언제 어디서 이 영화를 말했는지 출처까지 함께 있습니다.</div>`)
  p(`<a href="https://feelandnote.com/content/${m.work.id}" style="display:inline-block;padding:12px 24px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">『${esc(t)}』${eul(t)} 감상한 ${m.total}명 전체 보기 →</a>`)
  p(`</div></div>`)
  p(`<p style="margin:0;font-size:13px;color:#999;">작품 정보·포스터·예고편 출처 TMDB. 필앤노트가 운영합니다.</p>`)

  const tags = [t, `${t} 줄거리`, `${t} 평점`, '인생영화', '영화추천', '명작영화',
    ...(m.tmdb.director ?? []).slice(0, 1), ...(m.tmdb.cast ?? []).slice(0, 2).map((c) => c.name), '필앤노트']
  return { title, html: L.join('\n'), tags: [...new Set(tags)].filter(Boolean).slice(0, 10) }
}

// ── 인물 편 ────────────────────────────────────────────────
export type PersonMaterial = {
  celeb: { slug: string; name: string; profession: string | null; title: string | null; headline: string | null; bio: string | null; avatar: string | null }
  total: number
  usable: number
  picked: { id: string; title: string; poster: string | null; creator: string | null; release: string | null
            vote: number | null; voteCount?: number; overview?: string; runtime?: number; genres?: string[]; review: string
            trailer?: { key: string; name: string } | null }[]
}

export function renderPerson(m: PersonMaterial): { title: string; html: string; tags: string[] } {
  const who = m.celeb.name
  const prof = PROF[m.celeb.profession ?? ''] ?? ''
  const titleBase = `${who}${ga(who)} 감상한 영화 ${m.total}편`
  const title = m.picked.length === 1
    ? pickTitle([`${titleBase} | ${cleanTitle(m.picked[0].title)}`, titleBase])
    : fitTitle(titleBase, m.picked.slice(0, 5).map((p) => cleanTitle(p.title)))
  const L: string[] = []
  const p = (s: string) => L.push(s)

  if (m.celeb.avatar) {
    p(`<figure style="margin:0 !important;padding:0 0 24px !important;text-align:center;">`)
    p(`<img src="${m.celeb.avatar}" alt="${esc(who)}" style="width:130px !important;height:130px !important;object-fit:cover;border-radius:50%;border:1px solid #e3e3e3;" />`)
    p(`<figcaption style="margin-top:8px;font-size:13px;color:#888;">${esc(who)}${prof ? ` · ${prof}` : ''}</figcaption>`)
    p(`</figure>`)
  }

  const intro = (m.celeb.headline || m.celeb.title || '').replace(/[「」『』]/g, '')
  p(para(HELLO))
  /**
   * `bio` 는 「…얻었다」처럼 **간결체**로 쓰여 있다. 정중체 문단에 그대로 이으면 말투가
   * 어긋나므로 인용 상자에 따로 담는다. 소개는 `headline` 한 줄로 끝낸다.
   */
  /**
   * 🔴 상단에 블록을 겹겹이 쌓지 않는다. 아바타·캡션·인사·소개·bio 상자·안내 문단이
   *    줄줄이 서 있어 어지러웠다(26.09.05). `bio` 는 `headline` 과 겹치는 내용이라 뺀다 —
   *    간결체라 정중체 문단에 섞이지도 않는다. 작품 편과 같은 리듬(사진 → 인사 → 소개 →
   *    물음 → 목차)으로 맞춘다.
   */
  p(para(`오늘 만나볼 사람은 ${esc(who)}입니다.${intro ? ` ${esc(intro)}${ro(intro)} 알려져 있습니다.` : ''}`))
  // 번역투를 걷는다. 「…영화가 N편 있습니다 / 그는 …했을까요」 대신 주어를 덜어 낸다.
  p(para(`필앤노트에 모인 ${esc(who)}의 영화 감상 기록은 <b>${m.total}편</b>입니다. ${m.picked.length < m.total ? `그중 ${m.picked.length}편을 골라 소개합니다.` : m.picked.length === 1 ? '이 영화에 관해 남긴 이야기를 소개합니다.' : '각 영화에 관해 남긴 이야기를 소개합니다.'}`))

  const pSecs: Sec[] = m.picked.map((r, i) => ({ id: `fn-${i}`, label: esc(cleanTitle(r.title)) }))
  p(toc(pSecs))

  m.picked.forEach((r, i) => {
    /**
     * 🔴 가로 배치를 쓰지 않는다. 포스터 폭이 스킨에 밀려 148px 로 쪼그라들면 옆 정보 칸이
     *    화면 끝까지 벌어져 글이 휑해 보인다(26.09.05).
     *    그리고 절이 바뀌는 자리는 **가운데로 모은다** — 제목과 포스터가 왼쪽에 붙어 있으면
     *    오른쪽이 통째로 비어 2열처럼 읽힌다. 정보·줄거리·인용은 왼쪽에 둔다.
     */
    p(h2(`fn-${i}`, `${i + 1}. ${esc(cleanTitle(r.title))}`, true))
    if (r.poster) {
      p(`<div style="margin:0 !important;padding:0 0 16px !important;text-align:center;">`)
      p(`<img src="${r.poster}" alt="${esc(cleanTitle(r.title))} 포스터" width="220" style="width:220px !important;max-width:100% !important;border:1px solid #e3e3e3;border-radius:2px;display:inline-block;" />`)
      p(`</div>`)
    }
    p(`<div style="margin:0 !important;padding:0 0 6px !important;">`)
    p(`<div style="font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (r.release) p(`<div>개봉 ${r.release}</div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="${P_STYLE}color:#555;">${esc(r.overview)}</p>`)
    if (r.trailer) {
      p(`<div style="margin:0 !important;padding:0 0 14px !important;text-align:center;">`)
      p(`<iframe src="https://www.youtube.com/embed/${r.trailer.key}" title="${esc(cleanTitle(r.title))} 예고편" width="560" height="315" loading="lazy" frameborder="0" allowfullscreen style="width:100% !important;max-width:560px !important;height:315px !important;border:0;display:inline-block;"></iframe>`)
      p(`</div>`)
    }
    p(`<div style="margin:0 !important;padding:0 0 14px !important;"><div style="padding:20px 22px;border-left:3px solid #222;background:#fafafa;line-height:1.9;">${revHtml(r.review)}</div></div>`)
    /**
     * 작품마다 사이트로 가는 문을 둔다. 목록 편에는 「감상한 N명 전부 보기」가 작품마다
     * 있는데 인물 편에만 없어 대칭이 어긋났다. 이 채널은 사람을 사이트로 보내는 자리다.
     */
    p(`<div style="margin:0 !important;padding:0 0 20px !important;text-align:center;">`)
    p(`<a href="${workUrl(r.id)}" style="display:inline-block !important;padding:8px 16px !important;background:#f4f4f6;border:1px solid #e2e2e6;border-radius:999px;color:#111 !important;text-decoration:none !important;font-size:14px;font-weight:600;">『${esc(cleanTitle(r.title))}』${eul(r.title)} 감상한 사람들 →</a>`)
    p(`</div>`)
  })

  const rest = m.total - m.picked.length
  p(`<div style="margin:34px 0;padding:22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:6px;">${rest > 0 ? `${esc(who)}${ga(who)} 본 나머지 ${rest}편` : `${esc(who)}의 감상 기록`}</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:14px;">읽은 책과 들은 음악도 함께 있습니다.</div>`)
  p(`<a href="https://feelandnote.com/celeb/${m.celeb.slug}" style="display:inline-block;padding:11px 22px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">${esc(who)}의 기록 전체 보기 →</a>`)
  p(`</div>`)
  p(`<p style="font-size:13px;color:#999;">작품 정보·포스터 출처 TMDB. 감상 기록은 필앤노트에 등록된 내용을 바탕으로 정리했습니다. 필앤노트가 운영합니다.</p>`)

  const tags = [who, `${who} 영화`, `${who} 추천영화`, '인생영화', '영화추천', ...m.picked.slice(0, 3).map((r) => r.title), '필앤노트']
  return { title, html: L.join('\n'), tags: [...new Set(tags)].filter(Boolean).slice(0, 10) }
}

// ── 목록 편 ────────────────────────────────────────────────
type Voice = { name: string; slug: string; profession: string | null; title: string | null; review: string; avatar_url?: string | null }
export type ListMaterial = {
  list: { slug: string; title: string; description: string | null; method: string | null; publishedYear: number | null; sourceUrl: string | null; isRanked: boolean; isAnnual?: boolean }
  curator: { slug: string; name: string; kind: string | null; homepage: string | null } | null
  totalItems: number
  withVoice: number
  closing?: (Voice & { work: string; year: number | null }) | null
  banner?: { url: string; title: string } | null
  all: { rank: number | null; year: number | null; title: string; creator: string | null; contentId: string | null; voices: Voice[] }[]
  picked: (ListMaterial['all'][number] & { poster?: string | null; vote?: number | null; release?: string | null; overview?: string; runtime?: number; genres?: string[]; trailer?: { key: string; name: string } | null })[]
}

/**
 * 목록 편 제목의 대괄호 태그. 네이버 기관 선정 안내글이 쓰는 것과 같은 표를 쓴다 —
 * 두 채널이 같은 목록을 다룰 때 독자가 같은 시리즈로 알아본다.
 * 표에 없는 목록은 태그 없이 나간다(억지로 약어를 만들지 않는다).
 */
const LIST_TAG: Record<string, string> = {
  'afi-100-years-100-movies': 'AFI',
  'sight-and-sound-greatest-films-2022': 'BFI',
  'academy-best-picture': 'OSCAR',
  'cannes-palme-dor': 'CANNES',
  'venice-golden-lion': 'VENICE',
  'blue-dragon-film-awards': 'BLUEDRAGON',
  'timeout-horror-films': 'TIMEOUT',
  'bbc-greatest-comedies': 'BBC',
}

/**
 * 「목록명 + 편수」. 이름에 이미 숫자가 있으면 편수를 겹쳐 붙이지 않는다 —
 * 「AFI 선정 100대 영화 100편」이 되어 버린다.
 */
function listCount(title: string, n: number) {
  if (/\d\s*$/.test(title)) return `${title}편`
  if (/\d/.test(title)) return title
  return `${title} ${n}편`
}

export function renderList(m: ListMaterial): { title: string; html: string; tags: string[] } {
  const name = m.list.title
  const tag = LIST_TAG[m.list.slug]
  // 해마다 주는 상은 몇 년부터 몇 년까지인지가 정보다. 한 번 뽑은 순위 목록에는 붙이지 않는다.
  // 연도 범위는 제목에서 뺀다 — 자리를 먹고 검색어로는 거의 쓰이지 않는다. 본문 표에 다 있다.
  /**
   * 우선순위는 **목록명 > 헤드라인 > 태그**다. 목록명은 검색어라 못 줄이고, 헤드라인은
   * 이 채널만의 각이며, 태그는 브랜딩이라 자리가 없으면 먼저 뺀다.
   */
  const base = listCount(name, m.totalItems)
  const pre = tag ? `[${tag}] ` : ''
  /**
   * 🔴 **헤드라인에 「N편에 셀럽 감상 기록」을 쓰지 않는다.** 수상작 98편은 확정된 사실이지만
   * 54라는 수는 **우리가 출처를 확인해 수집한 만큼**일 뿐이고, 그중에서도 글에는 일부만
   * 싣는다(26.09.05). 독자에게 아무 뜻이 없는 숫자를 제목에 세우면 클릭도 신뢰도 못 얻는다.
   * 이 글이 실제로 해 주는 일 — **전체 목록 + 가장 많이 본 몇 편의 감상** — 을 그대로 적는다.
   * 헤드라인은 목록마다 흔들리지 않게 **한 문구로 고정**한다. 길이 때문에 대괄호 태그가
   * 빠지는 것은 감수한다 — 우선순위는 목록명 > 헤드라인 > 태그다.
   */
  /**
   * 부제는 **작품명 나열**이다. 작품 편(「마돈나·카를로 안첼로티」)·인물 편(「현기증·폭스캐처」)이
   * 이미 고유명사를 부제로 쓰므로 목록 편만 서술형이면 한 채널로 안 읽힌다. 아는 제목이
   * 보여야 클릭이 나오고, 작품명 자체가 검색어라 덤이 붙는다.
   * 태그가 붙은 판을 먼저 시도하고, 부제가 못 들어간 판은 후보에서 뺀다.
   */
  const films = m.picked.map((r) => cleanTitle(r.title))
  // 우선순위는 목록명 > 부제 > 태그다. **작품이 더 많이 들어가는 판**을 먼저 쓴다.
  const withSub = [fitTitle(`${pre}${base}`, films), fitTitle(base, films)]
    .filter((t) => t.includes(' | '))
    .sort((a, b) => b.split('·').length - a.split('·').length)
  const title = pickTitle([...withSub, `${pre}${base}`, base])
  const L: string[] = []
  const p = (s: string) => L.push(s)

  /** 시상식을 대표하는 이미지가 DB에 없어 그 목록에서 가장 많이 꼽힌 작품의 스틸컷을 쓴다. */
  if (m.banner) {
    p(`<div style="margin:0 !important;padding:0 0 26px !important;text-align:center;">`)
    p(`<img src="${m.banner.url}" alt="${esc(name)}" width="1280" style="width:100% !important;max-width:100% !important;border-radius:4px;display:block;" />`)
    p(`<div style="padding-top:8px;font-size:13px;color:#888;">『${esc(cleanTitle(m.banner.title))}』의 한 장면 · TMDB</div>`)
    p(`</div>`)
  }
  p(para(HELLO))
  p(para(`오늘 살펴볼 목록은 <b>${esc(name)}</b>입니다.${m.curator ? ` ${esc(m.curator.name)}가 고른 ${m.totalItems}편이고, 아래에 전체를 실었습니다.` : ` 아래에 ${m.totalItems}편 전체를 실었습니다.`}`))
  // `description`·`method` 도 간결체다. 정중체 본문과 섞이지 않게 상자에 담는다.
  const box = (html: string) =>
    p(`<div style="margin:0 !important;padding:0 0 20px !important;"><div style="padding:16px 18px;background:#f7f7f8;border-radius:6px;font-size:15px;line-height:1.8;color:#555;">${html}</div></div>`)
  if (m.list.description) box(esc(m.list.description))
  /**
   * `method` 에는 「…를 필자가 연 출처에서 확인하지 못했다」 같은 **작업 메모**가 괄호로 붙어
   * 있다. 사이트에서는 근거로 쓰이지만 블로그 독자에게는 군더더기다. 괄호 블록을 걷는다.
   */
  const method = (m.list.method ?? '').replace(/\s*\([^)]*(?:확인|미상|추정|필자|출처)[^)]*\)/g, '').trim()
  if (method) box(esc(method))
  p(para(`이 목록에는 다른 곳에 없는 것이 하나 붙습니다. ${m.totalItems}편 가운데 <b>${m.withVoice}편</b>에는 감독·배우·작가가 그 영화를 봤다고 말한 기록이 붙어 있습니다. 물론 이것이 전부는 아닙니다 — 필앤노트가 <b>출처를 확인한 것만</b> 셉니다. 아래에서는 그 가운데 가장 많이 언급된 ${m.picked.length}편을 발언과 함께 자세히 봅니다.`))

  // 상세 5편은 「가장 많이 꼽힌 …」의 하위 절이라 1-1 … 1-5 로 잇는다.
  p(toc([
    { id: 'fn-top', label: `셀럽이 가장 많이 본 ${m.picked.length}편`,
      subs: m.picked.map((r, i) => ({ id: `fn-${i}`, label: esc(cleanTitle(r.title)) })) },
    { id: 'fn-all', label: `${esc(name)} 전체 목록 ${m.totalItems}편` },
    { id: 'fn-wall', label: '이 글에 나온 사람들' },
  ]))

  p(h2('fn-top', `1. 셀럽이 가장 많이 본 ${m.picked.length}편`))
  m.picked.forEach((r, i) => {
    // 절 제목 바로 아래 첫 작품에는 선을 겹치지 않는다
    p(`${i ? RULE : ''}<h3 id="fn-${i}" style="margin:0 !important;padding:0 0 14px !important;font-size:19px;text-align:center;">1-${i + 1}. ${esc(cleanTitle(r.title))}${r.year ? ` <span style="font-weight:400;color:#999;">(${r.year})</span>` : ''}</h3>`)
    if (r.poster) {
      p(`<div style="margin:0 !important;padding:0 0 16px !important;text-align:center;">`)
      p(`<img src="${r.poster}" alt="${esc(cleanTitle(r.title))} 포스터" width="220" style="width:220px !important;max-width:100% !important;border:1px solid #e3e3e3;border-radius:2px;display:inline-block;" />`)
      p(`</div>`)
    }
    p(`<div style="margin:0 !important;padding:0 0 6px !important;">`)
    p(`<div style="font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (m.list.isRanked && r.rank) p(`<div>${esc(name)} <b style="color:#222;">${r.rank}위</b></div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`<div>이 영화를 감상한 셀럽 <b style="color:#222;">${r.voices.length}명</b></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="${P_STYLE}color:#555;">${esc(r.overview)}</p>`)
    if (r.trailer) {
      p(`<div style="margin:0 !important;padding:0 0 14px !important;text-align:center;">`)
      p(`<iframe src="https://www.youtube.com/embed/${r.trailer.key}" title="${esc(cleanTitle(r.title))} 예고편" width="560" height="315" loading="lazy" frameborder="0" allowfullscreen style="width:100% !important;max-width:560px !important;height:315px !important;border:0;display:inline-block;"></iframe>`)
      p(`</div>`)
    }
    // 인용은 **최대 3건**이다. 모자라면 있는 만큼 싣는다 — 억지로 채우지 않는다.
    r.voices.slice(0, 3).forEach((v) => {
      const label = [PROF[v.profession ?? ''] ?? '', (v.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
      p(`<div style="margin:14px 0;padding:18px 20px;border-left:3px solid #222;background:#fafafa;">`)
      p(`<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">`)
      if (v.avatar_url) p(`<img src="${v.avatar_url}" alt="${esc(v.name)}" width="64" height="64" style="width:64px !important;height:64px !important;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#eee;" />`)
      p(`<div>${celebBtn(v.name, v.slug, null, label)}</div>`)
      p(`</div>`)
      p(`<div style="line-height:1.9;">${revHtml(v.review)}</div>`)
      p(`</div>`)
    })
    if (r.contentId && r.voices.length > 3) {
      p(`<p style="font-size:14px;"><a href="https://feelandnote.com/content/${r.contentId}">『${esc(cleanTitle(r.title))}』${eul(r.title)} 감상한 ${r.voices.length}명 전부 보기 →</a></p>`)
    }
  })

  p(h2('fn-all', `2. ${esc(name)} 전체 목록 ${m.totalItems}편`))
  p(`<p style="color:#666;">맨 오른쪽 숫자는 <b>필앤노트에 감상 기록이 남은 셀럽 수</b>입니다. 작품을 누르시면 누가 어디서 무슨 말을 했는지 보실 수 있습니다.</p>`)
  p(`<table style="width:100%;border-collapse:collapse;font-size:14px;">`)
  p(`<thead><tr style="border-bottom:2px solid #222;">`)
  if (m.list.isRanked) p(`<th style="width:44px;text-align:left;padding:8px 0;">#</th>`)
  p(`<th style="text-align:left;padding:8px 0;">작품</th><th style="text-align:left;padding:8px 0;">감독</th><th style="width:56px;text-align:right;padding:8px 0;">연도</th><th style="width:76px;text-align:right;padding:8px 0;">셀럽</th>`)
  p(`</tr></thead><tbody>`)
  m.all.forEach((r) => {
    p(`<tr style="border-bottom:1px solid #eee;">`)
    if (m.list.isRanked) p(`<td style="padding:8px 0;color:#999;">${r.rank ?? ''}</td>`)
    const t = r.contentId && r.voices.length ? `<a href="https://feelandnote.com/content/${r.contentId}" style="color:#111;">${esc(cleanTitle(r.title))}</a>` : esc(cleanTitle(r.title))
    p(`<td style="padding:8px 0;">${t}</td>`)
    p(`<td style="padding:8px 0;color:#666;">${esc(r.creator ?? '')}</td>`)
    p(`<td style="padding:8px 0;text-align:right;color:#999;">${r.year ?? ''}</td>`)
    p(`<td style="padding:8px 0;text-align:right;">${r.voices.length ? `<b>${r.voices.length}</b>` : '<span style="color:#ccc;">-</span>'}</td>`)
    p(`</tr>`)
  })
  p(`</tbody></table>`)

  /**
   * 나온 사람을 **글 끝에 다시 모은다.** 목록 편은 상위 5편에 최대 15명이 흩어져 있어
   * 읽다 보면 누가 나왔는지 잊는다. 이 채널의 목적은 사람을 사이트로 보내는 것이므로
   * 마지막에 문을 한 줄로 늘어놓는다.
   */
  p(h2('fn-wall', '3. 이 글에 나온 사람들'))
  p(para('이름을 누르면 그 사람이 읽고 보고 들은 기록이 전부 열립니다.'))
  p(celebWall(m.picked.flatMap((r) => r.voices.slice(0, 3)).map((v) => ({
    name: v.name, slug: v.slug, avatar: v.avatar_url, label: PROF[v.profession ?? ''] ?? '',
  }))))

  p(`<div style="margin:34px 0;padding:22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:6px;">${esc(name)}을 필앤노트에서</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:14px;">누가 어떤 작품을 꼽았는지 인물별로 볼 수 있습니다.</div>`)
  p(`<a href="https://feelandnote.com/library/curated/${m.curator?.slug ?? ''}/${m.list.slug}" style="display:inline-block;padding:11px 22px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">목록 페이지로 →</a>`)
  p(`</div>`)
  /**
   * 마무리 인용. 본문에 안 나온 작품에서 고른 **실제 발언**이다. 기관의 표어를 지어 붙이지
   * 않는다 — 확인할 수 없는 문장은 한 줄로도 글 전체의 신뢰를 깎는다.
   */
  if (m.closing) {
    const who = [esc(m.closing.name), (m.closing.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
    p(`<blockquote style="margin:44px 0 10px;padding:22px 26px;border:0;border-top:1px solid #e6e6e6;border-bottom:1px solid #e6e6e6;text-align:center;">`)
    p(`<div style="font-size:16px;line-height:1.9;color:#333;">${revHtml(m.closing.review)}</div>`)
    p(`<div style="margin-top:12px;font-size:13px;color:#999;">— ${who} · 『${esc(cleanTitle(m.closing.work))}』${m.closing.year ? ` (${m.closing.year})` : ''}에 대하여</div>`)
    p(`</blockquote>`)
  }

  p(`<p style="font-size:13px;color:#999;">${m.list.sourceUrl ? `원문 출처 <a href="${m.list.sourceUrl}" rel="nofollow">${esc(m.curator?.name ?? '발표처')}</a>. ` : ''}작품 정보·포스터 출처 TMDB. 필앤노트가 운영합니다.</p>`)

  const tags = [name, `${name} 목록`, '영화목록', '명작영화', '영화추천', '인생영화', m.curator?.name ?? '', '필앤노트']
  return { title, html: L.join('\n'), tags: [...new Set(tags)].filter(Boolean).slice(0, 10) }
}
