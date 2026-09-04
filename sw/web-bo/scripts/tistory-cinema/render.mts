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

export type Picked = { slug: string; nickname: string; profession: string | null; title: string | null; review: string; source?: string | null }
export type Material = {
  work: { id: string; title: string; poster: string | null; creator: string | null; release: string | null }
  tmdb: { runtime?: number; vote?: number; voteCount?: number; genres?: string[]; overview?: string; original?: string
          cast?: { name: string; role: string }[]; director?: string[]
          trailer?: { key: string; name: string } | null; trailers?: { key: string; name: string; type: string }[] }
  total: number
  picked: Picked[]
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

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const anchor = (i: number) => `fn-${i}`

/** 인물 이름에서 링크할 사이트 주소 */
const celebUrl = (slug: string) => `https://feelandnote.com/celeb/${slug}`

export function renderWork(m: Material): { title: string; html: string; tags: string[] } {
  const t = m.work.title
  const year = (m.work.release ?? '').slice(0, 4)
  const names = m.picked.slice(0, 3).map((p) => p.nickname)
  const title = `『${t}』${eul(t)} 인생 영화로 꼽은 ${m.total}명 | ${names.join('·')}까지`

  const L: string[] = []
  const p = (s: string) => L.push(s)

  // 1. 포스터 — 가운데
  if (m.work.poster) {
    p(`<figure style="margin:0 0 28px;text-align:center;">`)
    p(`<img src="${m.work.poster}" alt="${esc(t)} 포스터" style="max-width:340px;width:100%;border:1px solid #e3e3e3;border-radius:2px;" />`)
    p(`<figcaption style="margin-top:8px;font-size:13px;color:#888;">${esc(t)}${year ? ` (${year})` : ''}</figcaption>`)
    p(`</figure>`)
  }

  // 2. 도입
  p(`<p>영화 이야기를 하다 보면 결국 이 작품으로 돌아옵니다. 그런데 『${esc(t)}』${eul(t)} 인생 영화로 꼽은 사람을 세어 보면 영화인만 있는 것이 아닙니다.</p>`)
  p(`<p>필앤노트에 <b>${m.total}명</b>의 기록이 남아 있습니다. 아래는 그 가운데 직군별로 고른 ${m.picked.length}명입니다.</p>`)

  // 3. 목차 — 긴 글의 이탈을 줄이고, 검색엔진에 문서 구조를 알린다
  p(`<div style="margin:28px 0;padding:18px 22px;background:#f7f7f8;border-radius:6px;">`)
  p(`<div style="font-weight:700;margin-bottom:10px;">목차</div>`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2;">`)
  p(`<li><a href="#fn-info">${esc(t)} 기본 정보 · 평점 · 러닝타임</a></li>`)
  if (m.tmdb.overview) p(`<li><a href="#fn-story">${esc(t)} 줄거리</a></li>`)
  if (m.tmdb.trailer) p(`<li><a href="#fn-trailer">예고편</a></li>`)
  p(`<li><a href="#fn-people">이 영화를 꼽은 ${m.total}명</a></li>`)
  p(`</ul></div>`)

  // 4. 기본 정보 표
  p(`<h2 id="fn-info">${esc(t)} 기본 정보</h2>`)
  p(`<table style="width:100%;border-collapse:collapse;font-size:15px;">`)
  const row = (k: string, v: string) =>
    p(`<tr><th style="width:104px;text-align:left;padding:9px 0;border-bottom:1px solid #eee;color:#666;font-weight:500;">${k}</th><td style="padding:9px 0;border-bottom:1px solid #eee;">${v}</td></tr>`)
  if (m.tmdb.original) row('원제', esc(m.tmdb.original))
  if (m.tmdb.director?.length) row('감독', esc(m.tmdb.director.join(', ')))
  // 배역명은 TMDB 한국어 데이터가 비어 영어로 오는 일이 많다. 한글일 때만 붙인다.
  if (m.tmdb.cast?.length) row('출연', m.tmdb.cast.map((c) => /[가-힣]/.test(c.role) ? `${esc(c.name)}<span style="color:#999;">(${esc(c.role)})</span>` : esc(c.name)).join(' · '))
  if (m.work.release) row('개봉', m.work.release)
  if (m.tmdb.runtime) row('러닝타임', `${m.tmdb.runtime}분`)
  if (m.tmdb.genres?.length) row('장르', esc(m.tmdb.genres.join(', ')))
  if (m.tmdb.vote) row('평점', `<b>${m.tmdb.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB · ${(m.tmdb.voteCount ?? 0).toLocaleString()}명)</span>`)
  p(`</table>`)

  // 5. 줄거리
  if (m.tmdb.overview) {
    p(`<h2 id="fn-story">${esc(t)} 줄거리</h2>`)
    p(`<p>${esc(m.tmdb.overview)}</p>`)
  }

  // 6. 예고편
  if (m.tmdb.trailer) {
    p(`<h2 id="fn-trailer">예고편</h2>`)
    p(`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0;">`)
    p(`<iframe src="https://www.youtube.com/embed/${m.tmdb.trailer.key}" title="${esc(t)} 예고편" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`)
    p(`</div>`)
  }

  // 7. 사람들
  p(`<h2 id="fn-people">『${esc(t)}』${eul(t)} 꼽은 사람들</h2>`)
  p(`<p style="color:#666;">인터뷰·팟캐스트·공식 프로필에 남은 발언입니다. 이름을 누르면 그 인물이 본 다른 작품도 볼 수 있습니다.</p>`)
  m.picked.forEach((r, i) => {
    const label = [PROF[r.profession ?? ''] ?? '', (r.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
    p(`<div id="${anchor(i)}" style="margin:26px 0;padding:18px 20px;border-left:3px solid #222;background:#fafafa;">`)
    p(`<div style="margin-bottom:8px;"><a href="${celebUrl(r.slug)}" style="font-weight:700;font-size:17px;color:#111;text-decoration:none;">${esc(r.nickname)}</a>${label ? ` <span style="font-size:13px;color:#888;">${esc(label)}</span>` : ''}</div>`)
    p(`<div style="line-height:1.85;">${esc(r.review)}</div>`)
    p(`</div>`)
  })

  // 8. 사이트로
  const rest = m.total - m.picked.length
  p(`<div style="margin:34px 0;padding:22px;text-align:center;background:#111;border-radius:8px;">`)
  p(`<div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:6px;">나머지 ${rest}명은 필앤노트에서</div>`)
  p(`<div style="color:#bbb;font-size:14px;margin-bottom:14px;">누가 언제 어디서 이 영화를 말했는지 출처까지 함께 있습니다.</div>`)
  // 도착지는 **작품 페이지**다. 인물 페이지로 보내면 「43명 전체 보기」와 화면이 어긋난다.
  p(`<a href="https://feelandnote.com/content/${m.work.id}" style="display:inline-block;padding:11px 22px;background:#fff;color:#111;border-radius:4px;text-decoration:none;font-weight:700;">『${esc(t)}』${eul(t)} 꼽은 ${m.total}명 전체 보기 →</a>`)
  p(`</div>`)

  p(`<p style="font-size:13px;color:#999;">작품 정보·포스터·예고편 출처 TMDB. 인물 발언은 각 인터뷰·팟캐스트·공식 프로필에서 옮겼습니다. 필앤노트가 운영합니다.</p>`)

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
  const title = `${who}${ga(who)} 꼽은 영화 ${m.total}편 | ${m.picked.slice(0, 3).map((p) => p.title).join('·')}`
  const L: string[] = []
  const p = (s: string) => L.push(s)

  if (m.celeb.avatar) {
    p(`<figure style="margin:0 0 24px;text-align:center;">`)
    p(`<img src="${m.celeb.avatar}" alt="${esc(who)}" style="width:150px;height:150px;object-fit:cover;border-radius:50%;border:1px solid #e3e3e3;" />`)
    p(`<figcaption style="margin-top:8px;font-size:13px;color:#888;">${esc(who)}${prof ? ` · ${prof}` : ''}</figcaption>`)
    p(`</figure>`)
  }

  const intro = (m.celeb.headline || m.celeb.title || '').replace(/[「」『』]/g, '')
  p(`<p>${esc(who)}${intro ? `${eun(who)} ${esc(intro)}로 알려져 있습니다. 그가` : ga(who)} 인터뷰와 방송에서 직접 말한 영화가 필앤노트에 <b>${m.total}편</b> 모여 있습니다.</p>`)
  p(`<p>아래는 그 가운데 널리 알려진 ${m.picked.length}편입니다. 인용은 모두 발언 출처가 있는 것만 골랐습니다.</p>`)

  p(`<div style="margin:28px 0;padding:18px 22px;background:#f7f7f8;border-radius:6px;">`)
  p(`<div style="font-weight:700;margin-bottom:10px;">목차</div>`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2;">`)
  m.picked.forEach((r, i) => p(`<li><a href="#fn-${i}">${esc(r.title)}</a></li>`))
  p(`</ul></div>`)

  m.picked.forEach((r, i) => {
    p(`<h2 id="fn-${i}">${i + 1}. ${esc(r.title)}</h2>`)
    p(`<div style="display:flex;gap:18px;align-items:flex-start;margin:14px 0 6px;flex-wrap:wrap;">`)
    if (r.poster) p(`<img src="${r.poster}" alt="${esc(r.title)} 포스터" style="width:150px;border:1px solid #e3e3e3;border-radius:2px;flex:0 0 auto;" />`)
    p(`<div style="flex:1 1 260px;min-width:240px;font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (r.release) p(`<div>개봉 ${r.release}</div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="color:#555;">${esc(r.overview)}</p>`)
    p(`<div style="margin:14px 0 30px;padding:18px 20px;border-left:3px solid #222;background:#fafafa;line-height:1.85;">${esc(r.review)}</div>`)
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
type Voice = { name: string; slug: string; profession: string | null; title: string | null; review: string }
export type ListMaterial = {
  list: { slug: string; title: string; description: string | null; method: string | null; publishedYear: number | null; sourceUrl: string | null; isRanked: boolean }
  curator: { slug: string; name: string; kind: string | null; homepage: string | null } | null
  totalItems: number
  withVoice: number
  all: { rank: number | null; year: number | null; title: string; creator: string | null; contentId: string | null; voices: Voice[] }[]
  picked: (ListMaterial['all'][number] & { poster?: string | null; vote?: number | null; release?: string | null; overview?: string; runtime?: number; genres?: string[] })[]
}

export function renderList(m: ListMaterial): { title: string; html: string; tags: string[] } {
  const name = m.list.title
  const title = `${name} 전체 목록 | 이 가운데 ${m.withVoice}편은 누군가의 인생 영화였다`
  const L: string[] = []
  const p = (s: string) => L.push(s)

  p(`<p><b>${esc(name)}</b>${m.curator ? ` — ${esc(m.curator.name)}가 고른 목록입니다.` : '입니다.'} 아래에 <b>${m.totalItems}편 전체</b>를 실었습니다.</p>`)
  if (m.list.description) p(`<p>${esc(m.list.description)}</p>`)
  /**
   * `method` 에는 「…를 필자가 연 출처에서 확인하지 못했다」 같은 **작업 메모**가 괄호로 붙어
   * 있다. 사이트에서는 근거로 쓰이지만 블로그 독자에게는 군더더기다. 괄호 블록을 걷는다.
   */
  const method = (m.list.method ?? '').replace(/\s*\([^)]*(?:확인|미상|추정|필자|출처)[^)]*\)/g, '').trim()
  if (method) p(`<p style="color:#555;">${esc(method)}</p>`)
  p(`<p>그리고 이 목록이 다른 곳과 갈리는 지점이 하나 있습니다. ${m.totalItems}편 가운데 <b>${m.withVoice}편</b>은 감독·배우·작가가 인터뷰에서 직접 자기 인생 영화로 꼽은 작품입니다. 누가 무엇을 말했는지 함께 적었습니다.</p>`)

  p(`<div style="margin:28px 0;padding:18px 22px;background:#f7f7f8;border-radius:6px;">`)
  p(`<div style="font-weight:700;margin-bottom:10px;">목차</div>`)
  p(`<ul style="margin:0;padding-left:18px;line-height:2;">`)
  p(`<li><a href="#fn-top">가장 많이 꼽힌 ${m.picked.length}편</a></li>`)
  p(`<li><a href="#fn-all">${esc(name)} 전체 목록 ${m.totalItems}편</a></li>`)
  p(`</ul></div>`)

  p(`<h2 id="fn-top">가장 많이 꼽힌 ${m.picked.length}편</h2>`)
  m.picked.forEach((r, i) => {
    p(`<h3 style="margin-top:30px;">${i + 1}. ${esc(r.title)}${r.year ? ` <span style="font-weight:400;color:#999;">(${r.year})</span>` : ''}</h3>`)
    p(`<div style="display:flex;gap:18px;align-items:flex-start;margin:12px 0;flex-wrap:wrap;">`)
    if (r.poster) p(`<img src="${r.poster}" alt="${esc(r.title)} 포스터" style="width:130px;border:1px solid #e3e3e3;border-radius:2px;flex:0 0 auto;" />`)
    p(`<div style="flex:1 1 260px;min-width:240px;font-size:14px;line-height:2;color:#555;">`)
    if (r.creator) p(`<div>감독 <b style="color:#222;">${esc(r.creator)}</b></div>`)
    if (m.list.isRanked && r.rank) p(`<div>${esc(name)} <b style="color:#222;">${r.rank}위</b></div>`)
    if (r.runtime) p(`<div>러닝타임 ${r.runtime}분</div>`)
    if (r.genres?.length) p(`<div>장르 ${esc(r.genres.join(', '))}</div>`)
    if (r.vote) p(`<div>평점 <b style="color:#222;">${r.vote.toFixed(1)}</b> / 10 <span style="color:#999;">(TMDB)</span></div>`)
    p(`<div>이 영화를 꼽은 사람 <b style="color:#222;">${r.voices.length}명</b></div>`)
    p(`</div></div>`)
    if (r.overview) p(`<p style="color:#555;">${esc(r.overview)}</p>`)
    r.voices.slice(0, 2).forEach((v) => {
      const label = [PROF[v.profession ?? ''] ?? '', (v.title ?? '').replace(/[「」『』]/g, '')].filter(Boolean).join(' · ')
      p(`<div style="margin:12px 0;padding:16px 18px;border-left:3px solid #222;background:#fafafa;">`)
      p(`<div style="margin-bottom:6px;"><a href="https://feelandnote.com/celeb/${v.slug}" style="font-weight:700;color:#111;text-decoration:none;">${esc(v.name)}</a>${label ? ` <span style="font-size:13px;color:#888;">${esc(label)}</span>` : ''}</div>`)
      p(`<div style="line-height:1.85;">${esc(v.review)}</div>`)
      p(`</div>`)
    })
    if (r.contentId && r.voices.length > 2) {
      p(`<p style="font-size:14px;"><a href="https://feelandnote.com/content/${r.contentId}">『${esc(r.title)}』${eul(r.title)} 꼽은 ${r.voices.length}명 전부 보기 →</a></p>`)
    }
  })

  p(`<h2 id="fn-all">${esc(name)} 전체 목록</h2>`)
  p(`<p style="color:#666;">「꼽은 사람」이 있는 작품은 그 수를 적었습니다. 눌러 보시면 누가 무엇을 말했는지 볼 수 있습니다.</p>`)
  p(`<table style="width:100%;border-collapse:collapse;font-size:14px;">`)
  p(`<thead><tr style="border-bottom:2px solid #222;">`)
  if (m.list.isRanked) p(`<th style="width:44px;text-align:left;padding:8px 0;">#</th>`)
  p(`<th style="text-align:left;padding:8px 0;">작품</th><th style="text-align:left;padding:8px 0;">감독</th><th style="width:56px;text-align:right;padding:8px 0;">연도</th><th style="width:76px;text-align:right;padding:8px 0;">꼽은 이</th>`)
  p(`</tr></thead><tbody>`)
  m.all.forEach((r) => {
    p(`<tr style="border-bottom:1px solid #eee;">`)
    if (m.list.isRanked) p(`<td style="padding:8px 0;color:#999;">${r.rank ?? ''}</td>`)
    const t = r.contentId && r.voices.length ? `<a href="https://feelandnote.com/content/${r.contentId}" style="color:#111;">${esc(r.title)}</a>` : esc(r.title)
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
  p(`<p style="font-size:13px;color:#999;">${m.list.sourceUrl ? `원문 출처 <a href="${m.list.sourceUrl}" rel="nofollow">${esc(m.curator?.name ?? '발표처')}</a>. ` : ''}작품 정보·포스터 출처 TMDB. 필앤노트가 운영합니다.</p>`)

  const tags = [name, `${name} 목록`, '영화목록', '명작영화', '영화추천', '인생영화', m.curator?.name ?? '', '필앤노트']
  return { title, html: L.join('\n'), tags: [...new Set(tags)].filter(Boolean).slice(0, 10) }
}
