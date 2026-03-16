import { useState } from 'react'

const PRESETS = {
  warrior: {
    label: '전사',
    headColor: '#e0c4a8',
    bodyColor: '#4a3db8',
    accentColor: '#ffeaa7',
    helmetColor: '#c0c0c0',
    hasHelmet: true,
    hasCape: true,
    capeColor: '#e74c3c',
  },
  scholar: {
    label: '학자',
    headColor: '#e0c4a8',
    bodyColor: '#2d3436',
    accentColor: '#dfe6e9',
    helmetColor: '#2d3436',
    hasHelmet: false,
    hasCape: false,
    capeColor: '#2d3436',
  },
  mystic: {
    label: '신비주의자',
    headColor: '#dcd6f7',
    bodyColor: '#1a1a2e',
    accentColor: '#a29bfe',
    helmetColor: '#6c5ce7',
    hasHelmet: true,
    hasCape: true,
    capeColor: '#6c5ce7',
  },
  emperor: {
    label: '황제',
    headColor: '#e0c4a8',
    bodyColor: '#6c3483',
    accentColor: '#f1c40f',
    helmetColor: '#f1c40f',
    hasHelmet: true,
    hasCape: true,
    capeColor: '#8e44ad',
  },
  assassin: {
    label: '암살자',
    headColor: '#c4a882',
    bodyColor: '#1a1a1a',
    accentColor: '#c0392b',
    helmetColor: '#1a1a1a',
    hasHelmet: true,
    hasCape: true,
    capeColor: '#2c2c2c',
  },
  priest: {
    label: '사제',
    headColor: '#e0c4a8',
    bodyColor: '#f5f0e1',
    accentColor: '#f39c12',
    helmetColor: '#f5f0e1',
    hasHelmet: false,
    hasCape: true,
    capeColor: '#f5f0e1',
  },
  viking: {
    label: '바이킹',
    headColor: '#d4a574',
    bodyColor: '#795548',
    accentColor: '#8d6e63',
    helmetColor: '#9e9e9e',
    hasHelmet: true,
    hasCape: false,
    capeColor: '#795548',
  },
  pharaoh: {
    label: '파라오',
    headColor: '#c68642',
    bodyColor: '#1565c0',
    accentColor: '#ffd700',
    helmetColor: '#ffd700',
    hasHelmet: true,
    hasCape: false,
    capeColor: '#1565c0',
  },
}

type PresetKey = keyof typeof PRESETS

export function CssArtLab() {
  const [preset, setPreset] = useState<PresetKey>('warrior')
  const [scale, setScale] = useState(1.5)
  const p = PRESETS[preset]

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>CSS-only Art</h2>
        <p>외부 의존성 없이 CSS gradient, clip-path, box-shadow만으로 캐릭터 조형. 브라우저 네이티브.</p>
      </div>

      <div className="lab-info">
        <strong>원리</strong><br />
        • <code>radial-gradient</code> — 유기적 형상 (얼굴, 눈)<br />
        • <code>clip-path: polygon()</code> — 실루엣 (갑옷, 투구)<br />
        • <code>box-shadow</code> — 깊이감, 디테일<br />
        • <code>::before / ::after</code> — 레이어링 (망토, 장식)<br />
        • <strong>장점</strong> — 번들 크기 0, 렌더 즉시, CSS 변수로 테마 제어
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>프리셋</label>
          <select className="lab-select" value={preset} onChange={(e) => setPreset(e.target.value as PresetKey)}>
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>크기: {scale.toFixed(1)}x</label>
          <input type="range" min={0.5} max={3} step={0.1} value={scale} onChange={(e) => setScale(+e.target.value)} />
        </div>
      </div>

      <div className="lab-canvas" style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <CssCharacter {...p} />
        </div>
      </div>

      {/* All presets */}
      <div style={{ marginTop: 24, marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        전체 프리셋
      </div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {Object.entries(PRESETS).map(([key, val]) => (
          <div
            key={key}
            className="lab-grid-item"
            style={{ cursor: 'pointer', padding: 24, borderColor: key === preset ? 'var(--accent)' : undefined }}
            onClick={() => setPreset(key as PresetKey)}
          >
            <CssCharacter {...val} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CssCharacter({
  headColor, bodyColor, accentColor, helmetColor, hasHelmet, hasCape, capeColor,
}: {
  headColor: string; bodyColor: string; accentColor: string; helmetColor: string;
  hasHelmet: boolean; hasCape: boolean; capeColor: string;
}) {
  return (
    <div style={{ position: 'relative', width: 80, height: 140 }}>
      {/* Cape */}
      {hasCape && (
        <div style={{
          position: 'absolute', top: 50, left: -10, width: 100, height: 80,
          background: `linear-gradient(180deg, ${capeColor}, ${capeColor}88)`,
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
          borderRadius: '0 0 8px 8px',
          zIndex: 0,
        }} />
      )}

      {/* Helmet */}
      {hasHelmet && (
        <div style={{
          position: 'absolute', top: -8, left: 14, width: 52, height: 28,
          background: `linear-gradient(180deg, ${helmetColor}, ${helmetColor}cc)`,
          borderRadius: '50% 50% 0 0',
          zIndex: 3,
        }}>
          {/* Plume */}
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            width: 8, height: 20,
            background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)`,
            borderRadius: '4px 4px 0 0',
          }} />
        </div>
      )}

      {/* Head */}
      <div style={{
        position: 'absolute', top: 8, left: 18, width: 44, height: 44,
        background: `radial-gradient(circle at 40% 35%, ${headColor}, ${headColor}dd)`,
        borderRadius: '50%',
        zIndex: 2,
        boxShadow: `inset -4px -4px 8px rgba(0,0,0,0.15)`,
      }}>
        {/* Eyes */}
        <div style={{ position: 'absolute', top: 16, left: 10, width: 6, height: 6, background: '#2d3436', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 16, left: 28, width: 6, height: 6, background: '#2d3436', borderRadius: '50%' }} />
        {/* Mouth */}
        <div style={{
          position: 'absolute', top: 28, left: 16, width: 12, height: 3,
          background: '#c0392b44', borderRadius: '0 0 6px 6px',
        }} />
      </div>

      {/* Neck */}
      <div style={{
        position: 'absolute', top: 48, left: 32, width: 16, height: 10,
        background: headColor, zIndex: 1,
      }} />

      {/* Body / Armor */}
      <div style={{
        position: 'absolute', top: 54, left: 10, width: 60, height: 50,
        background: `linear-gradient(180deg, ${bodyColor}, ${bodyColor}dd)`,
        clipPath: 'polygon(15% 0%, 85% 0%, 100% 30%, 95% 100%, 5% 100%, 0% 30%)',
        zIndex: 1,
      }}>
        {/* Belt / Accent */}
        <div style={{
          position: 'absolute', bottom: 12, left: 0, right: 0, height: 4,
          background: accentColor,
        }} />
      </div>

      {/* Arms */}
      <div style={{
        position: 'absolute', top: 58, left: 0, width: 12, height: 36,
        background: bodyColor, borderRadius: 6, zIndex: 0,
        transform: 'rotate(8deg)',
      }} />
      <div style={{
        position: 'absolute', top: 58, right: 0, width: 12, height: 36,
        background: bodyColor, borderRadius: 6, zIndex: 0,
        transform: 'rotate(-8deg)',
      }} />

      {/* Legs */}
      <div style={{
        position: 'absolute', top: 100, left: 20, width: 14, height: 36,
        background: `linear-gradient(180deg, ${bodyColor}cc, #2d3436)`,
        borderRadius: '0 0 4px 4px', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', top: 100, right: 20, width: 14, height: 36,
        background: `linear-gradient(180deg, ${bodyColor}cc, #2d3436)`,
        borderRadius: '0 0 4px 4px', zIndex: 1,
      }} />
    </div>
  )
}
