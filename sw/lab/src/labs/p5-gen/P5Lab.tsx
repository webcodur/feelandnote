import { useEffect, useRef, useState, useCallback } from 'react'
import p5 from 'p5'

type Mode = 'creature' | 'face' | 'tree'

const MODES: Record<Mode, { label: string; desc: string }> = {
  creature: { label: '유기체 크리처', desc: 'Perlin noise로 촉수/유기체 형상 생성' },
  face: { label: '제너레이티브 얼굴', desc: '랜덤 파라미터로 추상적 인물 초상' },
  tree: { label: '프랙탈 나무', desc: '재귀적 가지 분기. 각도·깊이 제어' },
}

export function P5Lab() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5Ref = useRef<p5 | null>(null)
  const [mode, setMode] = useState<Mode>('creature')
  const [seed, setSeed] = useState(42)
  const [param1, setParam1] = useState(5)
  const [param2, setParam2] = useState(0.5)

  const createSketch = useCallback(() => {
    if (p5Ref.current) {
      p5Ref.current.remove()
      p5Ref.current = null
    }
    if (!containerRef.current) return

    p5Ref.current = new p5((p: p5) => {
      p.setup = () => {
        p.createCanvas(600, 500)
        p.noiseSeed(seed)
        p.randomSeed(seed)
        p.background(16, 16, 24)
      }

      p.draw = () => {
        if (mode === 'creature') drawCreature(p, param1, param2)
        else if (mode === 'face') drawFace(p, param1, param2)
        else if (mode === 'tree') drawTree(p, param1, param2)
      }
    }, containerRef.current)
  }, [mode, seed, param1, param2])

  useEffect(() => {
    createSketch()
    return () => {
      p5Ref.current?.remove()
      p5Ref.current = null
    }
  }, [createSketch])

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>p5.js 제너레이티브</h2>
        <p>Perlin noise와 수학 함수로 유기적 형상 실시간 생성. 코드만으로 자연스러운 생명체 패턴.</p>
      </div>

      <div className="lab-info">
        <strong>원리</strong><br />
        • <code>p.noise()</code> — Perlin noise. 자연스러운 변동값 생성<br />
        • <code>p.randomSeed()</code> / <code>p.noiseSeed()</code> — 시드 기반 결정론적 랜덤<br />
        • 파라미터 조정으로 형태 실시간 변화 관찰<br />
        • <code>npm: p5</code>
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>모드</label>
          <select className="lab-select" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {Object.entries(MODES).map(([key, val]) => (
              <option key={key} value={key}>{val.label} — {val.desc}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>시드: {seed}</label>
          <input type="range" min={1} max={100} value={seed} onChange={(e) => setSeed(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>{mode === 'tree' ? '깊이' : '밀도'}: {param1}</label>
          <input type="range" min={1} max={12} value={param1} onChange={(e) => setParam1(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>{mode === 'tree' ? '각도' : '스케일'}: {param2.toFixed(2)}</label>
          <input type="range" min={0.1} max={1.5} step={0.05} value={param2} onChange={(e) => setParam2(+e.target.value)} />
        </div>
        <button className="lab-btn" onClick={() => setSeed(Math.floor(Math.random() * 999))}>
          랜덤 시드
        </button>
      </div>

      <div className="lab-canvas" style={{ display: 'inline-block', padding: 0 }}>
        <div ref={containerRef} />
      </div>
    </div>
  )
}

function drawCreature(p: p5, density: number, scale: number) {
  p.background(16, 16, 24, 15)
  p.translate(p.width / 2, p.height / 2)
  p.noFill()

  const t = p.frameCount * 0.01
  for (let i = 0; i < density; i++) {
    const hue = p.map(i, 0, density, 200, 320)
    p.stroke(
      p.map(p.sin(hue * 0.01), -1, 1, 80, 180),
      p.map(p.cos(hue * 0.02), -1, 1, 100, 200),
      p.map(p.sin(hue * 0.015), -1, 1, 150, 255),
      60,
    )
    p.strokeWeight(2)

    p.beginShape()
    for (let a = 0; a < p.TWO_PI; a += 0.05) {
      const r = 50 + p.noise(p.cos(a) * scale + i * 0.5, p.sin(a) * scale + i * 0.5, t + i * 0.3) * 150
      const x = p.cos(a) * r
      const y = p.sin(a) * r
      p.vertex(x, y)
    }
    p.endShape(p.CLOSE)
  }
}

function drawFace(p: p5, density: number, scale: number) {
  p.background(16, 16, 24)
  p.translate(p.width / 2, p.height / 2)
  p.noStroke()

  // Head shape
  const headW = 120 * scale + p.random(40)
  const headH = 140 * scale + p.random(40)
  p.fill(220, 190, 160)
  p.ellipse(0, 0, headW, headH)

  // Eyes
  const eyeSpread = 15 + p.random(15)
  const eyeSize = 8 + p.random(8)
  p.fill(40)
  p.ellipse(-eyeSpread, -10, eyeSize, eyeSize * 0.7)
  p.ellipse(eyeSpread, -10, eyeSize, eyeSize * 0.7)
  p.fill(255)
  p.ellipse(-eyeSpread + 2, -12, 3, 3)
  p.ellipse(eyeSpread + 2, -12, 3, 3)

  // Nose
  p.fill(200, 170, 140)
  p.triangle(-3, 5, 3, 5, 0, -5 + p.random(5))

  // Mouth
  p.fill(180, 80, 80)
  p.arc(0, 20 + p.random(10), 20 + p.random(15), 8 + p.random(6), 0, p.PI)

  // Hair strands
  p.stroke(40 + p.random(30), 30 + p.random(20), 20 + p.random(20))
  p.strokeWeight(2)
  p.noFill()
  for (let i = 0; i < density * 4; i++) {
    const startX = p.map(i, 0, density * 4, -headW / 2, headW / 2)
    p.beginShape()
    for (let j = 0; j < 6; j++) {
      p.vertex(
        startX + p.noise(i, j * 0.3) * 20 - 10,
        -headH / 2 - j * (8 + p.random(4)),
      )
    }
    p.endShape()
  }

  p.noLoop()
}

function drawTree(p: p5, depth: number, angleScale: number) {
  p.background(16, 16, 24)
  p.translate(p.width / 2, p.height - 40)

  const branch = (len: number, d: number) => {
    if (d <= 0 || len < 2) return
    const sw = p.map(d, 0, depth, 1, 6)
    p.strokeWeight(sw)
    p.stroke(
      p.map(d, 0, depth, 80, 60),
      p.map(d, 0, depth, 180, 100),
      p.map(d, 0, depth, 80, 50),
      200,
    )
    p.line(0, 0, 0, -len)
    p.translate(0, -len)

    const angle = (p.PI / 6) * angleScale + p.noise(d * 0.5) * 0.3
    const shrink = 0.65 + p.noise(d) * 0.15

    p.push()
    p.rotate(angle)
    branch(len * shrink, d - 1)
    p.pop()

    p.push()
    p.rotate(-angle)
    branch(len * shrink, d - 1)
    p.pop()

    if (d <= 2) {
      p.noStroke()
      p.fill(160 + p.random(60), 80 + p.random(40), 120 + p.random(60), 150)
      p.ellipse(0, 0, 6 + p.random(6), 6 + p.random(6))
    }
  }

  branch(80, depth)
  p.noLoop()
}
