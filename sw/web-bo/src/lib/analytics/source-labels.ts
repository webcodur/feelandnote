interface SourceExplanation { title: string; description: string }

const sources: Record<string, SourceExplanation> = {
  'm.search.naver.com': { title: '네이버 모바일 검색', description: '네이버 모바일 검색 화면을 출처로 기록한 방문입니다. 검색에서 왔어도 GA에는 외부 링크(referral)로 분류될 수 있습니다.' },
  'search.naver.com': { title: '네이버 검색 화면', description: '네이버 검색 화면의 링크를 거쳐 온 것으로 기록됐습니다. 검색 유입이어도 referral로 표시될 수 있습니다.' },
  'm.blog.naver.com': { title: '네이버 모바일 블로그', description: '네이버 블로그 모바일 화면의 링크를 거쳐 온 것으로 기록됐습니다.' },
  'blog.naver.com': { title: '네이버 블로그', description: '네이버 블로그 글 등의 링크를 거쳐 온 것으로 기록됐습니다.' },
  'searchadvisor.naver.com': { title: '네이버 서치어드바이저', description: '사이트 등록·수집 상태 점검 도구를 출처로 기록한 방문입니다. 운영자가 점검하며 연 접속일 수 있어 일반 독자 유입과 구별해 봅니다.' },
  'android_app': { title: 'feelandnote 안드로이드 앱', description: '앱 실행·바로가기 주소에 붙인 유입 태그입니다. twa는 웹사이트를 앱 안에서 여는 방식이며 검색이나 광고를 뜻하지 않습니다.' },
  'accounts.google.com': { title: '구글 로그인 경유', description: '구글 계정 화면을 출처로 기록한 방문입니다. 로그인 후 복귀일 수 있어 새로운 방문자를 데려온 경로로 단정하지 않습니다.' },
  'kauth.kakao.com': { title: '카카오 로그인 경유', description: '카카오 인증 화면을 출처로 기록한 방문입니다. 로그인 후 복귀일 수 있습니다.' },
  'admin.linkprice.com': { title: '링크프라이스 관리자 화면', description: '제휴 링크 관리 화면에서 들어온 것으로 기록됐습니다. 운영자나 제휴 링크 점검 접속일 수 있습니다.' },
}

const sourceNames: Record<string, string> = {
  naver: '네이버', google: '구글', bing: '빙', yandex: '얀덱스',
  'chatgpt.com': 'ChatGPT', 'copilot.com': 'Microsoft Copilot',
  perplexity: 'Perplexity', 'perplexity.ai': 'Perplexity',
  'noai.duckduckgo.com': 'DuckDuckGo', 'duckduckgo': 'DuckDuckGo',
}

const media: Record<string, { label: string; description: string }> = {
  organic: { label: '무료 검색', description: '광고가 아닌 검색 결과를 통한 방문으로 분류됐습니다.' },
  referral: { label: '외부 링크', description: '다른 사이트의 링크를 거쳐 온 방문으로 기록됐습니다. 검색 사이트도 이 분류에 들어올 수 있습니다.' },
  cpc: { label: '유료 광고로 기록', description: '유료 광고 유입으로 분류됐습니다. 태그 등으로 정해지는 값이므로 실제 광고 집행·과금 여부는 이 값만으로 확인할 수 없습니다.' },
  'ai-assistant': { label: 'AI 서비스 유입', description: 'AI 서비스를 출처로 지정한 방문입니다. 이 값만으로 자동 수집 봇인지 판단할 수 없습니다.' },
  email: { label: '이메일', description: '이메일 링크 유입으로 지정한 태그입니다.' },
  social: { label: '소셜', description: '소셜 서비스 유입으로 분류됐습니다.' },
  '(not set)': { label: '유입 방식 미확인', description: '출처 이름은 있지만 유입 방식 정보가 없습니다. 직접 방문과 같은 의미는 아닙니다.' },
}

/** 원본 source / medium은 보존하고, 확인된 출처와 GA 분류의 의미만 설명한다. */
export function describeTrafficSource(raw: string): SourceExplanation {
  if (!raw || raw === '(not set)') return { title: '유입 정보 미확인', description: 'GA가 세션의 출처·유입 방식을 정하는 데 필요한 정보를 받지 못했습니다. 주소를 직접 입력했다는 뜻은 아닙니다.' }
  const separator = raw.lastIndexOf(' / ')
  const source = separator < 0 ? raw : raw.slice(0, separator)
  const medium = separator < 0 ? '' : raw.slice(separator + 3)
  const key = source.toLowerCase().replace(/^www\./, '')
  if (key === '(direct)' && ['(none)', '(not set)', ''].includes(medium)) {
    return { title: '직접 방문·출처 미확인', description: '주소 직접 입력·즐겨찾기뿐 아니라 앱·메신저 등에서 출처 정보가 전달되지 않은 방문도 섞입니다. Direct만으로 실제 사람이나 봇을 구별할 수 없습니다.' }
  }
  if (sources[key]) return sources[key]
  const name = sourceNames[key] ?? source
  const explanation = media[medium]
  if (explanation) return { title: `${name} · ${explanation.label}`, description: explanation.description }
  return { title: name, description: medium
    ? `이 출처에서 온 것으로 기록됐습니다. ${medium}은 유입 방식의 원본 분류값이며 세부 경로는 추가 확인이 필요합니다.`
    : '출처 이름만 기록돼 있습니다. 어떤 링크나 방식으로 들어왔는지는 추가 확인이 필요합니다.' }
}
