/*
  파일명: /labs/explore-art/ExploreArtLab.tsx
  기능: 탐색 바로가기 카드 그림 시안 보관소 — 서비스에서 내린 안을 실제 카드 크기로 본다
*/ // ------------------------------

import ArtFrame from './ArtFrame'

const DRAFTS = [
  { key: 'balance', title: '스펙트럼 — 천칭', note: '양극 비교를 기울어진 저울로. 일대일 대결로 읽혀 내렸다. 서비스는 최초의 관측판 형태를 쓴다.' },
  { key: 'mountain', title: '신화의 세계 — 신들의 산', note: '구름 띠 위 세 봉우리와 정상의 문. 신전 기반이 맞아 내렸다.' },
  { key: 'arch', title: '세력도감 — 아치 안 두 진영', note: '쐐기돌 대표 메달과 경계선 양옆 진영. 관계망 그래프가 맞아 내렸다.' },
]

const SIZES = [
  { label: '넓은 화면 카드 (3:1)', width: 670, height: 223 },
  { label: '휴대폰 카드 (4:3)', width: 172, height: 129 },
]

export function ExploreArtLab() {
  return (
    <div style={{ padding: 24, color: '#e0e0e0', background: '#121212', minHeight: '100%' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>탐색 카드 그림 시안</h1>
      <p style={{ margin: '0 0 24px', color: '#a0a0a0', fontSize: 13 }}>
        흑요석 위 금선 세공 양식. 판(하늘·후광·지평선)은 서비스와 같고 그림만 시안이다. 원본 SVG는 sw/web의 explore/artwork 에 있다.
      </p>
      {DRAFTS.map((d) => (
        <section key={d.key} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>{d.title}</h2>
          <p style={{ margin: '0 0 12px', color: '#a0a0a0', fontSize: 13 }}>{d.note}</p>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {SIZES.map((s) => (
              <figure key={s.label} style={{ margin: 0 }}>
                <div style={{ width: s.width, height: s.height, overflow: 'hidden', borderRadius: 10, border: '1px solid rgba(212,175,55,.25)', background: '#101112' }}>
                  <ArtFrame variant={d.key} />
                </div>
                <figcaption style={{ fontSize: 12, color: '#808080', marginTop: 6 }}>{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
