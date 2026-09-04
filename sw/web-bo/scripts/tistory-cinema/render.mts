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
}

const PROF: Record<string, string> = {
  director: '감독', actor: '배우', musician: '음악가', athlete: '스포츠', entrepreneur: '기업가',
  humanities_scholar: '학자', social_scientist: '학자', natural_scientist: '학자', scientist: '학자',
  author: '작가', poet: '작가', influencer: '크리에이터', investor: '투자자',
  politician: '정치인', leader: '정치인', commander: '군인', visual_artist: '예술가', other: '',
}
/** 한글 받침에 맞춰 조사를 고른다. 「대부을」 같은 글이 나가면 그 한 줄에서 신뢰를 잃는다. */
const josa = (word: string, withBatchim: string, without: string) => {
  const last = word.replace(/[』」\]\)]+$/, '').slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return without   // 한글이 아니면(숫자·영문) 받침 없는 쪽
  return (code - 0xac00) % 28 ? withBatchim : without
}
const eul = (w: string) => josa(w, '을', '를')
const eun = (w: string) => josa(w, '은', '는')
const ga = (w: string) => josa(w, '이', '가')
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
const TITLE_MAX = 36
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
const h2 = (id: string, text: string) =>
  `<h2 id="${id}" style="margin:0 !important;padding:34px 0 16px !important;font-size:21px;line-height:1.45;border-top:1px solid #eee;">${text}</h2>`
const h3 = (text: string) => `<h3 style="margin:0 !important;padding:24px 0 10px !important;font-size:17px;">${text}</h3>`
/** 배경·테두리가 있는 블록의 바깥 여백. 스킨이 margin 을 죽여도 이 래퍼는 남는다. */
const gap = (html: string, px = 26) => `<div style="margin:0 !important;padding:0 0 ${px}px !important;">${html}</div>`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/**
 * 원문에 빈 줄이 있으면 문단으로 살린다. 알렉스 퍼거슨의 388자 감상처럼 두 문단으로 쓴
 * 것이 한 덩어리로 붙어 나오면 읽기 어렵다. 원문을 고치지 않고 보이는 방식만 맞춘다.
 */
const revHtml = (t: string) =>
  esc(t).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).join('</p><p style="margin:0 !important;padding:14px 0 0 !important;">')

const anchor = (i: number) => `fn-${i}`

/** 인물 이름에서 링크할 사이트 주소 */
const celebUrl = (slug: string) => `https://feelandnote.com/celeb/${slug}`

export function renderWork(m: Material): { title: string; html: string; tags: string[] } {
  const t = cleanTitle(m.work.title)
  const year = (m.work.release ?? m.tmdb.release ?? '').slice(0, 4)
  const names = m.picked.slice(0, 6).map((p) => p.nickname).sort((a, b) => a.length - b.length)
  const title = fitTitle(`『${t}』${eul(t)} 인생 영화로 꼽은 ${m.total}명`, names)

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
  const madeBy = [year ? `${year}년` : '', m.tmdb.director?.length ? `${esc(m.tmdb.director[0])}${ga(m.tmdb.director[0])} 만든` : '',
    m.tmdb.genres?.length ? `${esc(m.tmdb.genres.slice(0, 2).join('·'))} 영화` : '작품'].filter(Boolean).join(' ')
  p(para(`오늘 만나볼 영화는 『${esc(t)}』입니다. ${madeBy}입니다.`))
  p(para(`이 작품을 인생 영화로 꼽은 사람이 <b>${m.total}명</b> 있습니다.${pair.length === 2 ? ` 감독과 배우만이 아니라 ${pair[0]}·${pair[1]} 쪽에서도 이 영화를 말했습니다.` : ''} 그들은 어디서 무슨 말을 했을까요?`))

  p(`<div style="margin:0 !important;padding:10px 0 32px !important;"><div style="padding:20px 24px;background:#f7f7f8;border-radius:6px;">`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2.2;">`)
  p(`<li><a href="#fn-about">『${esc(t)}』${eun(t)} 어떤 영화인가</a></li>`)
  p(`<li><a href="#fn-people">이 영화를 인생작으로 꼽은 ${m.picked.length}명</a></li>`)
  p(`<li><a href="#fn-note">필앤노트 리뷰</a></li>`)
  p(`</ul></div></div>`)

  p(h2('fn-about', `『${esc(t)}』${eun(t)} 어떤 영화인가`))
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
    p(h3('줄거리'))
    p(para(esc(m.tmdb.overview)))
  }
  if (m.tmdb.trailer) {
    p(h3('예고편'))
    /**
     * 🔴 `padding-bottom:56.25%` 반응형 상자는 쓰지 않는다. 스킨이 `padding` 을 덮으면
     *    상자만 남고 화면이 빈다(26.09.05). 폭·높이를 직접 못 박는다.
     */
    p(`<div style="margin:0 !important;padding:0 0 8px !important;">`)
    p(`<iframe src="https://www.youtube.com/embed/${m.tmdb.trailer.key}" title="${esc(t)} 예고편" width="640" height="360" frameborder="0" allowfullscreen style="width:100% !important;max-width:640px !important;height:360px !important;border:0;display:block;"></iframe>`)
    p(`</div>`)
    p(`<p style="margin:0 0 22px;font-size:13px;color:#999;">영상이 보이지 않으면 <a href="https://www.youtube.com/watch?v=${m.tmdb.trailer.key}" rel="nofollow">유튜브에서 보기</a></p>`)
  }

  p(h2('fn-people', `이 영화를 인생작으로 꼽은 ${m.picked.length}명`))
  p(para(`인터뷰·팟캐스트·공식 프로필에 남은 말을 <b>고치지 않고</b> 옮겼습니다. 이름을 누르면 그 사람이 본 다른 작품도 보실 수 있습니다.`))
  m.picked.forEach((r, i) => {
    const label = [PROF[r.profession ?? ''] ?? '', (r.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
    const intro = (r.headline || r.bio || '').trim()
    p(`<div style="margin:0 !important;padding:0 0 26px !important;"><div id="${anchor(i)}" style="padding:20px 22px;border-left:3px solid #222;background:#fafafa;">`)
    p(`<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">`)
    // 아바타는 작게 — 인물 페이지가 아니라 누구인지 알려 주는 표지다
    if (r.avatar_url) p(`<img src="${r.avatar_url}" alt="${esc(r.nickname)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#eee;" />`)
    p(`<div style="flex:1 1 auto;min-width:0;">`)
    p(`<div><a href="${celebUrl(r.slug)}" style="font-weight:700;font-size:16px;color:#111;text-decoration:none;">${esc(r.nickname)}</a>${label ? ` <span style="font-size:13px;color:#888;">${esc(label)}</span>` : ''}</div>`)
    if (intro) p(`<div style="margin-top:2px;font-size:13.5px;color:#777;line-height:1.6;">${esc(intro)}</div>`)
    p(`</div></div>`)
    p(`<div style="line-height:1.9;">${revHtml(r.review)}</div>`)
    p(`</div></div>`)
  })

  p(h2('fn-note', '필앤노트 리뷰'))
  const filmFolk = (m.profCount?.director ?? 0) + (m.profCount?.actor ?? 0)
  const outside = m.total - filmFolk
  if (outside > 0 && nonFilm.length) {
    p(para(`이 영화를 꼽은 ${m.total}명 가운데 감독과 배우는 ${filmFolk}명입니다. 나머지 ${outside}명은 ${nonFilm.slice(0, 3).map(([k]) => PL(k)).filter(Boolean).join('·')}처럼 영화를 만들지 않는 사람들입니다.`))
  }
  if (m.alsoLiked?.length) {
    const list = m.alsoLiked.map((a) => `『${esc(cleanTitle(a.title))}』(${a.n}명)`).join(', ')
    p(para(`이 사람들이 『${esc(t)}』 말고 함께 꼽은 작품은 ${list} 순입니다. 같은 영화를 인생작으로 든 사람들이 무엇을 더 보았는지는 기록을 모아 두어야 보입니다.`))
  }
  p(`<p style="${P_STYLE}color:#666;">필앤노트는 인물이 실제로 읽고 보고 들은 것을 <b>출처와 함께</b> 모읍니다. 위 발언은 모두 인터뷰·팟캐스트·공식 프로필에서 옮겼고 원문을 고치지 않았습니다.</p>`)

  const rest = m.total - m.picked.length
  p(`<div style="margin:0 !important;padding:12px 0 !important;"><div style="padding:28px 22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<img src="https://feelandnote.com/icon.png" alt="필앤노트" style="width:52px !important;height:52px !important;border-radius:12px;margin-bottom:14px;" />`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:8px;">나머지 ${rest}명은 필앤노트에서</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:18px;">누가 언제 어디서 이 영화를 말했는지 출처까지 함께 있습니다.</div>`)
  p(`<a href="https://feelandnote.com/content/${m.work.id}" style="display:inline-block;padding:12px 24px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">『${esc(t)}』${eul(t)} 꼽은 ${m.total}명 전체 보기 →</a>`)
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
            vote: number | null; voteCount?: number; overview?: string; runtime?: number; genres?: string[]; review: string }[]
}

export function renderPerson(m: PersonMaterial): { title: string; html: string; tags: string[] } {
  const who = m.celeb.name
  const prof = PROF[m.celeb.profession ?? ''] ?? ''
  const title = fitTitle(`${who}${ga(who)} 꼽은 영화 ${m.total}편`, m.picked.slice(0, 5).map((p) => cleanTitle(p.title)))
  const L: string[] = []
  const p = (s: string) => L.push(s)

  if (m.celeb.avatar) {
    p(`<figure style="margin:0 0 24px;text-align:center;">`)
    p(`<img src="${m.celeb.avatar}" alt="${esc(who)}" style="width:150px !important;height:150px !important;object-fit:cover;border-radius:50%;border:1px solid #e3e3e3;" />`)
    p(`<figcaption style="margin-top:8px;font-size:13px;color:#888;">${esc(who)}${prof ? ` · ${prof}` : ''}</figcaption>`)
    p(`</figure></div>`)
  }

  const intro = (m.celeb.headline || m.celeb.title || '').replace(/[「」『』]/g, '')
  p(para(`오늘 만나볼 사람은 ${esc(who)}입니다.${intro ? ` ${esc(intro)}${ro(intro)} 알려져 있습니다.` : ''}`))
  p(para(`${esc(who)}${ga(who)} 인터뷰와 방송에서 직접 말한 영화가 <b>${m.total}편</b> 있습니다. 아래는 그 가운데 널리 알려진 ${m.picked.length}편입니다. 그는 무엇을 보고 무슨 말을 했을까요?`))

  p(`<div style="margin:28px 0;padding:18px 22px;background:#f7f7f8;border-radius:6px;">`)
  p(`<div style="font-weight:700;margin-bottom:10px;">목차</div>`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2;">`)
  m.picked.forEach((r, i) => p(`<li><a href="#fn-${i}">${esc(cleanTitle(r.title))}</a></li>`))
  p(`</ul></div></div>`)

  m.picked.forEach((r, i) => {
    p(h2(`fn-${i}`, `${i + 1}. ${esc(cleanTitle(r.title))}`))
    p(`<div style="display:flex;gap:18px;align-items:flex-start;margin:14px 0 6px;flex-wrap:wrap;">`)
    if (r.poster) p(`<img src="${r.poster}" alt="${esc(cleanTitle(r.title))} 포스터" style="width:150px !important;border:1px solid #e3e3e3;border-radius:2px;flex:0 0 auto;" />`)
    p(`<div style="flex:1 1 260px;min-width:240px;font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (r.release) p(`<div>개봉 ${r.release}</div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="${P_STYLE}color:#555;">${esc(r.overview)}</p>`)
    p(`<div style="margin:16px 0 34px;padding:20px 22px;border-left:3px solid #222;background:#fafafa;line-height:1.9;">${revHtml(r.review)}</div>`)
  })

  const rest = m.total - m.picked.length
  p(`<div style="margin:34px 0;padding:22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:6px;">${esc(who)}${ga(who)} 본 나머지 ${rest}편</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:14px;">읽은 책과 들은 음악도 함께 있습니다.</div>`)
  p(`<a href="https://feelandnote.com/celeb/${m.celeb.slug}" style="display:inline-block;padding:11px 22px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">${esc(who)}의 기록 전체 보기 →</a>`)
  p(`</div>`)
  p(`<p style="font-size:13px;color:#999;">작품 정보·포스터 출처 TMDB. 발언은 각 인터뷰·방송에서 옮겼습니다. 필앤노트가 운영합니다.</p>`)

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
  all: { rank: number | null; year: number | null; title: string; creator: string | null; contentId: string | null; voices: Voice[] }[]
  picked: (ListMaterial['all'][number] & { poster?: string | null; vote?: number | null; release?: string | null; overview?: string; runtime?: number; genres?: string[] })[]
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
  const title = pickTitle([
    `${pre}${base} | ${m.withVoice}편은 누군가의 인생 영화`,
    `${pre}${base} | ${m.withVoice}편은 인생 영화`,
    `${base} | ${m.withVoice}편은 누군가의 인생 영화`,
    `${base} | ${m.withVoice}편은 인생 영화`,
    `${pre}${base}`,
    base,
  ])
  const L: string[] = []
  const p = (s: string) => L.push(s)

  p(para(`오늘 살펴볼 목록은 <b>${esc(name)}</b>입니다.${m.curator ? ` ${esc(m.curator.name)}가 고른 ${m.totalItems}편이고, 아래에 전체를 실었습니다.` : ` 아래에 ${m.totalItems}편 전체를 실었습니다.`}`))
  if (m.list.description) p(para(esc(m.list.description)))
  /**
   * `method` 에는 「…를 필자가 연 출처에서 확인하지 못했다」 같은 **작업 메모**가 괄호로 붙어
   * 있다. 사이트에서는 근거로 쓰이지만 블로그 독자에게는 군더더기다. 괄호 블록을 걷는다.
   */
  const method = (m.list.method ?? '').replace(/\s*\([^)]*(?:확인|미상|추정|필자|출처)[^)]*\)/g, '').trim()
  if (method) p(`<p style="${P_STYLE}color:#555;">${esc(method)}</p>`)
  p(para(`이 목록이 다른 곳과 갈리는 지점이 하나 있습니다. ${m.totalItems}편 가운데 <b>${m.withVoice}편</b>은 필앤노트에 기록이 있는 감독·배우·작가가 자기 인생 영화로 꼽은 작품입니다. 그들은 어디서 무슨 말을 했을까요?`))

  p(`<div style="margin:28px 0;padding:18px 22px;background:#f7f7f8;border-radius:6px;">`)
  p(`<div style="font-weight:700;margin-bottom:10px;">목차</div>`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2;">`)
  p(`<li><a href="#fn-top">가장 많이 꼽힌 ${m.picked.length}편</a></li>`)
  p(`<li><a href="#fn-all">${esc(name)} 전체 목록 ${m.totalItems}편</a></li>`)
  p(`</ul></div></div>`)

  p(h2('fn-top', `가장 많이 꼽힌 ${m.picked.length}편`))
  m.picked.forEach((r, i) => {
    p(`<h3 style="margin:34px 0 12px;font-size:18px;">${i + 1}. ${esc(cleanTitle(r.title))}${r.year ? ` <span style="font-weight:400;color:#999;">(${r.year})</span>` : ''}</h3>`)
    p(`<div style="display:flex;gap:18px;align-items:flex-start;margin:12px 0;flex-wrap:wrap;">`)
    if (r.poster) p(`<img src="${r.poster}" alt="${esc(cleanTitle(r.title))} 포스터" style="width:130px !important;border:1px solid #e3e3e3;border-radius:2px;flex:0 0 auto;" />`)
    p(`<div style="flex:1 1 260px;min-width:240px;font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (m.list.isRanked && r.rank) p(`<div>${esc(name)} <b style="color:#222;">${r.rank}위</b></div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`<div>이 영화를 꼽은 사람 <b style="color:#222;">${r.voices.length}명</b></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="${P_STYLE}color:#555;">${esc(r.overview)}</p>`)
    r.voices.slice(0, 2).forEach((v) => {
      const label = [PROF[v.profession ?? ''] ?? '', (v.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
      p(`<div style="margin:14px 0;padding:18px 20px;border-left:3px solid #222;background:#fafafa;">`)
      p(`<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">`)
      if (v.avatar_url) p(`<img src="${v.avatar_url}" alt="${esc(v.name)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#eee;" />`)
      p(`<div><a href="https://feelandnote.com/celeb/${v.slug}" style="font-weight:700;color:#111;text-decoration:none;">${esc(v.name)}</a>${label ? ` <span style="font-size:13px;color:#888;">${esc(label)}</span>` : ''}</div>`)
      p(`</div>`)
      p(`<div style="line-height:1.9;">${revHtml(v.review)}</div>`)
      p(`</div>`)
    })
    if (r.contentId && r.voices.length > 2) {
      p(`<p style="font-size:14px;"><a href="https://feelandnote.com/content/${r.contentId}">『${esc(cleanTitle(r.title))}』${eul(r.title)} 꼽은 ${r.voices.length}명 전부 보기 →</a></p>`)
    }
  })

  p(h2('fn-all', `${esc(name)} 전체 목록`))
  p(`<p style="color:#666;">맨 오른쪽 숫자는 <b>필앤노트에 기록이 있는 인물 가운데 그 작품을 꼽은 사람 수</b>입니다. 작품을 누르시면 누가 어디서 무슨 말을 했는지 보실 수 있습니다.</p>`)
  p(`<table style="width:100%;border-collapse:collapse;font-size:14px;">`)
  p(`<thead><tr style="border-bottom:2px solid #222;">`)
  if (m.list.isRanked) p(`<th style="width:44px;text-align:left;padding:8px 0;">#</th>`)
  p(`<th style="text-align:left;padding:8px 0;">작품</th><th style="text-align:left;padding:8px 0;">감독</th><th style="width:56px;text-align:right;padding:8px 0;">연도</th><th style="width:76px;text-align:right;padding:8px 0;">꼽은 이</th>`)
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
