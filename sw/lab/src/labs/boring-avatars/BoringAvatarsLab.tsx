import { useState } from 'react'
import Avatar from 'boring-avatars'

const VARIANTS = ['marble', 'beam', 'pixel', 'sunset', 'ring', 'bauhaus'] as const
type Variant = (typeof VARIANTS)[number]

const PALETTES = {
  'Neo-Pantheon': ['#1a1a2e', '#6c5ce7', '#a29bfe', '#dfe6e9', '#ffeaa7'],
  'Ocean': ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  'Forest': ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
  'Neon': ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b'],
  'Mono': ['#0d1b2a', '#1b2838', '#415a77', '#778da9', '#e0e1dd'],
}

const SAMPLE_NAMES = [
  'Alexander', 'Napoleon', 'Cleopatra', 'Leonardo',
  'Einstein', 'Mozart', 'Tesla', 'Darwin',
  'Socrates', 'Caesar', 'Confucius', 'Elon',
]

export function BoringAvatarsLab() {
  const [name, setName] = useState('Alexander')
  const [variant, setVariant] = useState<Variant>('beam')
  const [palette, setPalette] = useState<keyof typeof PALETTES>('Neo-Pantheon')
  const [size, setSize] = useState(120)

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Boring Avatars</h2>
        <p>이름 문자열 → 결정론적 기하학적 아바타. 6가지 변형. 컬러 팔레트 커스텀. SVG 출력.</p>
      </div>

      <div className="lab-info">
        <strong>특징</strong><br />
        • 극도로 가볍다 (의존성 없음, ~2KB). React 컴포넌트 하나<br />
        • <code>name</code> 프롭이 시드. 같은 이름 = 같은 아바타<br />
        • <code>colors</code>로 브랜드 팔레트 적용 가능<br />
        • 전신 캐릭터는 아님 — 프로필 아이콘/심볼 용도<br />
        • <code>npm: boring-avatars</code>
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>이름 (시드)</label>
          <input
            className="lab-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
        <div className="lab-control-group">
          <label>변형</label>
          <select className="lab-select" value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
            {VARIANTS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>팔레트</label>
          <select className="lab-select" value={palette} onChange={(e) => setPalette(e.target.value as keyof typeof PALETTES)}>
            {Object.keys(PALETTES).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>크기: {size}px</label>
          <input type="range" min={40} max={240} value={size} onChange={(e) => setSize(+e.target.value)} />
        </div>
      </div>

      {/* Single preview */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="lab-canvas" style={{ padding: 24, display: 'inline-block' }}>
          <Avatar name={name} size={size} variant={variant} colors={PALETTES[palette]} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            name: <code style={{ color: 'var(--accent)' }}>"{name}"</code> · variant: <code>{variant}</code>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {PALETTES[palette].map((c) => (
              <div key={c} style={{ width: 24, height: 24, background: c, borderRadius: 4, border: '1px solid #333' }} title={c} />
            ))}
          </div>
        </div>
      </div>

      {/* All variants with sample names */}
      <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        전체 변형 · 샘플 인물 12명
      </div>

      {VARIANTS.map((v) => (
        <div key={v} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>{v}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {SAMPLE_NAMES.map((n) => (
              <div
                key={n}
                className="lab-grid-item"
                style={{ cursor: 'pointer', padding: 12 }}
                onClick={() => { setName(n); setVariant(v) }}
              >
                <Avatar name={n} size={64} variant={v} colors={PALETTES[palette]} />
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
