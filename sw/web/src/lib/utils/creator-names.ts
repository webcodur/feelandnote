/*
  파일명: /lib/utils/creator-names.ts
  기능: 창작자 표기 한 줄을 인물 대조가 가능한 조각으로 나눈다.
  책임: 화면에 보이는 글자는 원문 그대로 두고, 그중 어디가 사람 이름인지만 표시한다.
        「윤인완 글, 양경일 그림」은 이름 둘과 역할·구분자로 갈라지고, 「Simon & Garfunkel」은
        갈라지지 않는다 — 앰퍼샌드로 이어진 표기는 대개 한 팀의 이름이다.
*/ // ------------------------------

/** 이름을 가르는 문자. 앰퍼샌드와 and는 팀 이름을 쪼개므로 넣지 않는다. */
const SEPARATOR = /([,;/|·、]+)/

/** 이름 뒤에 붙는 역할 표기. 공백 뒤에 올 때만 떼어 「김저」 같은 이름을 지킨다 */
const ROLE_SUFFIX =
  /(\s+(?:지음|엮음|옮김|편저|편역|감수|원작|글|그림|사진|저자|저|편|역|외)\s*)$/

/** 괄호로 묶인 역할·부연. 「홍길동(지은이)」의 뒷부분 */
const PARENTHETICAL = /([([（【][^)\]）】]*[)\]）】]\s*)$/

export interface CreatorSegment {
  /** 화면에 그대로 낼 원문 조각 */
  text: string
  /** 인물 대조에 쓸 이름. 구분자·역할 표기처럼 대조 대상이 아니면 null */
  name: string | null
}

/** 대조용 열쇠 — 대소문자와 잉여 공백만 지운다. 표기가 다르면 다른 사람으로 둔다. */
export function normalizeCreatorName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** 이름 하나를 [앞 공백, 이름, 뒤 역할]로 가른다. 이름이 남지 않으면 통째로 돌려준다. */
function splitOne(chunk: string): CreatorSegment[] {
  const leading = chunk.match(/^\s+/)?.[0] ?? ''
  let body = chunk.slice(leading.length)
  const trailing: string[] = []

  // 「홍길동(지은이) 지음」처럼 겹쳐 붙는 경우가 있어 붙은 만큼 벗긴다
  for (;;) {
    const paren = body.match(PARENTHETICAL)
    if (paren) {
      trailing.unshift(paren[1])
      body = body.slice(0, body.length - paren[1].length)
      continue
    }
    const role = body.match(ROLE_SUFFIX)
    if (role) {
      trailing.unshift(role[1])
      body = body.slice(0, body.length - role[1].length)
      continue
    }
    break
  }

  const name = body.trim()
  if (!name) return [{ text: chunk, name: null }]

  const segments: CreatorSegment[] = []
  if (leading) segments.push({ text: leading, name: null })
  segments.push({ text: body, name })
  if (trailing.length > 0) segments.push({ text: trailing.join(''), name: null })
  return segments
}

/**
 * 창작자 표기를 조각으로 나눈다. 조각을 순서대로 이어 붙이면 원문이 그대로 복원된다.
 * name이 채워진 조각만 인물 대조 대상이다.
 */
export function splitCreatorNames(raw: string | null | undefined): CreatorSegment[] {
  if (!raw || !raw.trim()) return []

  return raw
    .split(SEPARATOR)
    .filter((chunk) => chunk !== '')
    .flatMap((chunk) => (SEPARATOR.test(chunk) ? [{ text: chunk, name: null }] : splitOne(chunk)))
}

/** 대조에 보낼 이름만 중복 없이 모은다 */
export function collectCreatorNames(segments: CreatorSegment[]): string[] {
  const seen = new Set<string>()
  for (const segment of segments) {
    if (segment.name) seen.add(segment.name)
  }
  return [...seen]
}
