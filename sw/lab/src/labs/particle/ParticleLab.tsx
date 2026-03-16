import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'

const SHAPES = {
  sphere: { label: '구체', desc: '파티클이 구 형태로 수렴' },
  humanoid: { label: '인체', desc: '파티클이 인체 실루엣으로 수렴' },
  spiral: { label: '나선', desc: '파티클이 나선형으로 배치' },
  cube: { label: '정육면체', desc: '파티클이 큐브 형태로 수렴' },
}

type Shape = keyof typeof SHAPES

function generateTargets(shape: Shape, count: number): Float32Array {
  const targets = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0

    if (shape === 'sphere') {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.5
      x = r * Math.sin(phi) * Math.cos(theta)
      y = r * Math.sin(phi) * Math.sin(theta)
      z = r * Math.cos(phi)
    } else if (shape === 'humanoid') {
      const part = Math.random()
      if (part < 0.2) {
        // Head
        const a = Math.random() * Math.PI * 2
        const r = 0.3 * Math.sqrt(Math.random())
        x = Math.cos(a) * r
        y = 2.2 + Math.sin(a) * r
        z = (Math.random() - 0.5) * 0.4
      } else if (part < 0.5) {
        // Torso
        x = (Math.random() - 0.5) * 0.8
        y = 0.8 + Math.random() * 1.2
        z = (Math.random() - 0.5) * 0.4
      } else if (part < 0.7) {
        // Left arm
        x = -0.6 - Math.random() * 0.8
        y = 1.0 + Math.random() * 0.8
        z = (Math.random() - 0.5) * 0.3
      } else if (part < 0.9) {
        // Right arm
        x = 0.6 + Math.random() * 0.8
        y = 1.0 + Math.random() * 0.8
        z = (Math.random() - 0.5) * 0.3
      } else {
        // Legs
        x = (Math.random() > 0.5 ? 0.2 : -0.2) + (Math.random() - 0.5) * 0.2
        y = Math.random() * 0.8
        z = (Math.random() - 0.5) * 0.3
      }
    } else if (shape === 'spiral') {
      const t = i / count * Math.PI * 8
      const r = 0.3 + t * 0.05
      x = Math.cos(t) * r
      y = t * 0.15 - 1
      z = Math.sin(t) * r
    } else if (shape === 'cube') {
      const face = Math.floor(Math.random() * 6)
      const u = (Math.random() - 0.5) * 2
      const v = (Math.random() - 0.5) * 2
      if (face === 0) { x = 1; y = u; z = v }
      else if (face === 1) { x = -1; y = u; z = v }
      else if (face === 2) { x = u; y = 1; z = v }
      else if (face === 3) { x = u; y = -1; z = v }
      else if (face === 4) { x = u; y = v; z = 1 }
      else { x = u; y = v; z = -1 }
    }

    targets[i * 3] = x
    targets[i * 3 + 1] = y
    targets[i * 3 + 2] = z
  }

  return targets
}

function Particles({ count, shape, speed, size, color }: {
  count: number; shape: Shape; speed: number; size: number; color: string
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, targets, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 8
      velocities[i] = 0
    }
    const targets = generateTargets(shape, count)
    return { positions, targets, velocities }
  }, [count, shape])

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute

    for (let i = 0; i < count * 3; i++) {
      const diff = targets[i] - pos.array[i]
      velocities[i] += diff * 0.02 * speed
      velocities[i] *= 0.92
      ;(pos.array as Float32Array)[i] += velocities[i]
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

export function ParticleLab() {
  const [shape, setShape] = useState<Shape>('humanoid')
  const [count, setCount] = useState(3000)
  const [speed, setSpeed] = useState(1)
  const [size, setSize] = useState(0.03)
  const [color, setColor] = useState('#a29bfe')
  const [key, setKey] = useState(0)

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Particle System</h2>
        <p>수천 파티클이 목표 형상으로 수렴. 등장/퇴장/변신 연출. 형상 전환 시 리셋 버튼.</p>
      </div>

      <div className="lab-info">
        <strong>원리</strong><br />
        • 각 파티클에 <strong>목표 좌표</strong> 할당. 스프링 물리로 서서히 이동<br />
        • <code>shape</code> 변경 시 목표 좌표 재계산 → 파티클 재배치 애니메이션<br />
        • <strong>humanoid</strong> — 머리·몸통·팔·다리 영역에 확률적 배치<br />
        • <strong>활용</strong> — 인물 등장 연출, 형태 변환, 퇴장 시 해체 효과
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>형상</label>
          <select className="lab-select" value={shape} onChange={(e) => { setShape(e.target.value as Shape); setKey(k => k + 1) }}>
            {Object.entries(SHAPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {v.desc}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>파티클 수: {count}</label>
          <input type="range" min={500} max={8000} step={500} value={count} onChange={(e) => { setCount(+e.target.value); setKey(k => k + 1) }} />
        </div>
        <div className="lab-control-group">
          <label>속도: {speed.toFixed(1)}</label>
          <input type="range" min={0.2} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>크기: {size.toFixed(3)}</label>
          <input type="range" min={0.01} max={0.1} step={0.005} value={size} onChange={(e) => setSize(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>컬러</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, height: 32 }} />
        </div>
        <button className="lab-btn" onClick={() => setKey(k => k + 1)}>
          리셋 (흩뿌리기)
        </button>
      </div>

      <div className="lab-canvas lab-canvas-full">
        <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
          <Particles key={key} count={count} shape={shape} speed={speed} size={size} color={color} />
          <OrbitControls />
          <Environment preset="night" />
        </Canvas>
      </div>
    </div>
  )
}
