import { useState, useMemo } from 'react'
import Avatar, { genConfig, type AvatarFullConfig } from 'react-nice-avatar'

const SAMPLE_SEEDS = [
  'alexander', 'napoleon', 'cleopatra', 'leonardo',
  'einstein', 'mozart', 'tesla', 'darwin',
  'socrates', 'caesar', 'confucius', 'elon',
]

// Simple seed-based deterministic random
function seededRandom(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash
  }
  const x = Math.sin(hash) * 10000
  return x - Math.floor(x)
}

function seededConfig(seed: string): AvatarFullConfig {
  // Use genConfig() to get random config, but make it deterministic via manual seeding
  const r = seededRandom(seed)
  const r2 = seededRandom(seed + '_2')
  const r3 = seededRandom(seed + '_3')
  const sexOptions = ['man', 'woman'] as const
  const hairManOptions = ['normal', 'thick', 'mohawk'] as const
  const hairWomanOptions = ['normal', 'womanLong', 'womanShort'] as const
  const faceColors = ['#F9C9B6', '#AC6651']
  const hairColors = ['#000', '#fff', '#77311D', '#FC909F', '#D2EFF3', '#506AF4', '#F48150']
  const hatStyles = ['beanie', 'turban', 'none'] as const
  const eyeStyles = ['circle', 'oval', 'smile'] as const
  const sex = sexOptions[Math.floor(r * sexOptions.length)]

  return {
    sex,
    faceColor: faceColors[Math.floor(r * faceColors.length)],
    earSize: r > 0.5 ? 'big' : 'small',
    hairColor: hairColors[Math.floor(r2 * hairColors.length)],
    hairStyle: sex === 'man'
      ? hairManOptions[Math.floor(r2 * hairManOptions.length)]
      : hairWomanOptions[Math.floor(r2 * hairWomanOptions.length)],
    hatStyle: hatStyles[Math.floor(r3 * hatStyles.length)],
    hatColor: hairColors[Math.floor(r3 * hairColors.length)],
    eyeStyle: eyeStyles[Math.floor(r * eyeStyles.length)],
    glassesStyle: r2 > 0.7 ? 'round' : 'none',
    noseStyle: r > 0.5 ? 'long' : 'short',
    mouthStyle: r3 > 0.5 ? 'laugh' : 'smile',
    shirtStyle: r2 > 0.5 ? 'polo' : 'hopizontalStripes' as never,
    shirtColor: hairColors[Math.floor((r + r2) * 0.5 * hairColors.length)],
    bgColor: 'transparent',
    isGradient: false,
  } as AvatarFullConfig
}

export function NiceAvatarLab() {
  const [seed, setSeed] = useState('alexander')
  const [count, setCount] = useState(12)

  const config = useMemo(() => seededConfig(seed), [seed])

  const grid = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const s = `${seed}-variant-${i}`
      return { seed: s, config: seededConfig(s) }
    })
  }, [seed, count])

  const randomConfigs = useMemo(() => {
    return Array.from({ length: 8 }, () => genConfig())
  }, [])

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Nice Avatar</h2>
        <p>애니메이션풍 SVG 캐릭터. 시드 기반 결정론적 생성 또는 완전 랜덤.</p>
      </div>

      <div className="lab-info">
        <strong>특징</strong><br />
        • 헤어, 눈, 입, 코, 안경, 모자, 의상 등 세부 파라미터<br />
        • <code>genConfig()</code>로 완전 랜덤 생성, 또는 시드 해시로 결정론적 생성<br />
        • SVG 기반. 스케일 자유자재<br />
        • <code>npm: react-nice-avatar</code>
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>시드</label>
          <input
            className="lab-input"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
        <div className="lab-control-group">
          <label>변형 수: {count}</label>
          <input type="range" min={4} max={24} value={count} onChange={(e) => setCount(+e.target.value)} />
        </div>
      </div>

      <div className="lab-controls" style={{ marginTop: 0 }}>
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

      {/* Main preview */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 24, marginTop: 24 }}>
        <div className="lab-canvas" style={{ padding: 24, display: 'inline-block' }}>
          <Avatar {...config} style={{ width: 180, height: 180 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            seed: <code style={{ color: 'var(--accent)' }}>"{seed}"</code>
          </div>
          <pre style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, maxWidth: 300, overflow: 'auto' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>

      {/* Seed variants */}
      <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        시드 기반 변형 {count}개
      </div>
      <div className="lab-grid">
        {grid.map((item) => (
          <div
            key={item.seed}
            className="lab-grid-item"
            style={{ cursor: 'pointer' }}
            onClick={() => setSeed(item.seed)}
          >
            <Avatar {...item.config} style={{ width: 100, height: 100 }} />
            <span style={{ fontSize: 10, wordBreak: 'break-all', textAlign: 'center' }}>{item.seed.slice(0, 20)}</span>
          </div>
        ))}
      </div>

      {/* Random gallery */}
      <div style={{ marginTop: 32, marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        genConfig() 완전 랜덤 갤러리
      </div>
      <div className="lab-grid">
        {randomConfigs.map((cfg, i) => (
          <div key={i} className="lab-grid-item">
            <Avatar {...cfg} style={{ width: 100, height: 100 }} />
            <span>랜덤 #{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
