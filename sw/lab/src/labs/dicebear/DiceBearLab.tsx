import { useState, useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import {
  avataaars, lorelei, notionists, openPeeps,
  personas, pixelArt, bigSmile, thumbs,
} from '@dicebear/collection'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLES: Record<string, { style: any; label: string; desc: string }> = {
  avataaars: { style: avataaars, label: 'Avataaars', desc: '전신 카툰 캐릭터. 의류·헤어·악세서리 조합' },
  lorelei: { style: lorelei, label: 'Lorelei', desc: '우아한 라인아트 스타일 초상화' },
  notionists: { style: notionists, label: 'Notionists', desc: 'Notion풍 심플 캐릭터' },
  openPeeps: { style: openPeeps, label: 'Open Peeps', desc: '손그림 스타일 전신 인물' },
  personas: { style: personas, label: 'Personas', desc: '모던 기하학적 캐릭터' },
  pixelArt: { style: pixelArt, label: 'Pixel Art', desc: '레트로 도트 아바타' },
  bigSmile: { style: bigSmile, label: 'Big Smile', desc: '밝은 표정의 미니멀 캐릭터' },
  thumbs: { style: thumbs, label: 'Thumbs', desc: '귀여운 엄지 캐릭터' },
}

const SAMPLE_SEEDS = [
  'alexander-the-great', 'napoleon-bonaparte', 'leonardo-da-vinci',
  'elon-musk', 'cleopatra', 'einstein', 'mozart', 'darwin',
  'socrates', 'tesla', 'caesar', 'confucius',
]

export function DiceBearLab() {
  const [seed, setSeed] = useState('alexander-the-great')
  const [selectedStyle, setSelectedStyle] = useState('avataaars')
  const [size] = useState(200)

  const singleAvatar = useMemo(() => {
    const s = STYLES[selectedStyle]
    if (!s) return ''
    return createAvatar(s.style, { seed, size }).toDataUri()
  }, [seed, selectedStyle, size])

  const allStyleAvatars = useMemo(() => {
    return Object.entries(STYLES).map(([key, val]) => ({
      key,
      label: val.label,
      desc: val.desc,
      uri: createAvatar(val.style, { seed, size: 160 }).toDataUri(),
    }))
  }, [seed])

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>DiceBear Avatars</h2>
        <p>시드 문자열 하나로 결정론적 SVG 캐릭터 생성. 동일 시드 = 동일 캐릭터. 30+ 스타일 지원. 완전 무료, 오프라인.</p>
      </div>

      <div className="lab-info">
        <strong>사용법</strong><br />
        • <code>seed</code> — 인물의 고유 식별자 (slug, 이름 등). 같은 시드는 항상 같은 얼굴을 생성한다<br />
        • <code>style</code> — 아트 스타일 선택. 게임용(Pixel Art), 프로필용(Avataaars), 일러스트(Open Peeps) 등<br />
        • <strong>활용</strong> — 인물별 고유 아바타를 코드만으로 생성. DB의 celeb slug를 시드로 쓰면 일관성 보장<br />
        • <code>npm: @dicebear/core + @dicebear/collection</code>
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>시드 (인물 식별자)</label>
          <input
            className="lab-input"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="인물 이름 또는 slug"
            style={{ width: 240 }}
          />
        </div>
        <div className="lab-control-group">
          <label>스타일</label>
          <select
            className="lab-select"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
          >
            {Object.entries(STYLES).map(([key, val]) => (
              <option key={key} value={key}>{val.label} — {val.desc}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <label style={{ width: '100%' }}>샘플 인물</label>
          {SAMPLE_SEEDS.map((s) => (
            <button
              key={s}
              className={seed === s ? 'lab-btn' : 'lab-btn-outline'}
              onClick={() => setSeed(s)}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Selected style large preview */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="lab-canvas" style={{ padding: 24, display: 'inline-block' }}>
          <img src={singleAvatar} alt={seed} width={size} height={size} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{STYLES[selectedStyle]?.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            seed: <code style={{ color: 'var(--accent)' }}>"{seed}"</code>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
            {STYLES[selectedStyle]?.desc}
          </div>
        </div>
      </div>

      {/* All styles grid */}
      <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        동일 시드, 전체 스타일 비교
      </div>
      <div className="lab-grid">
        {allStyleAvatars.map((a) => (
          <div
            key={a.key}
            className="lab-grid-item"
            style={{
              cursor: 'pointer',
              borderColor: a.key === selectedStyle ? 'var(--accent)' : undefined,
            }}
            onClick={() => setSelectedStyle(a.key)}
          >
            <img src={a.uri} alt={a.label} width={120} height={120} />
            <span style={{ fontWeight: a.key === selectedStyle ? 600 : 400 }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
