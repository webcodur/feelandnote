import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { createNoise3D } from 'simplex-noise'
import * as THREE from 'three'
import { useState } from 'react'

function MorphingBlob({ speed, amplitude, detail, color }: {
  speed: number; amplitude: number; detail: number; color: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const noise3D = useMemo(() => createNoise3D(), [])
  const originalPositions = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, detail)
    return new Float32Array(geo.attributes.position.array)
  }, [detail])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const positions = meshRef.current.geometry.attributes.position
    const t = clock.elapsedTime * speed

    for (let i = 0; i < positions.count; i++) {
      const ox = originalPositions[i * 3]
      const oy = originalPositions[i * 3 + 1]
      const oz = originalPositions[i * 3 + 2]

      const n = noise3D(ox * 1.5 + t * 0.3, oy * 1.5 + t * 0.2, oz * 1.5 + t * 0.4)
      const displacement = 1 + n * amplitude

      positions.setXYZ(i, ox * displacement, oy * displacement, oz * displacement)
    }
    positions.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, detail]} />
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.4}
        wireframe={false}
      />
    </mesh>
  )
}

const COLOR_PRESETS = {
  '신전 보라': '#6c5ce7',
  '심해 청록': '#00b894',
  '용암 주황': '#e17055',
  '달빛 은색': '#b2bec3',
  '황금': '#fdcb6e',
  '피의 적색': '#d63031',
}

export function MorphingBlobLab() {
  const [speed, setSpeed] = useState(1)
  const [amplitude, setAmplitude] = useState(0.3)
  const [detail, setDetail] = useState(4)
  const [color, setColor] = useState('#6c5ce7')

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Morphing Blob</h2>
        <p>Simplex noise로 정이십면체를 실시간 변형. 유기적 생명체/크리처를 코드 파라미터만으로 생성.</p>
      </div>

      <div className="lab-info">
        <strong>원리</strong><br />
        • <code>IcosahedronGeometry</code> — 정이십면체. detail값이 높을수록 표면 분할 증가<br />
        • <code>simplex-noise</code> — 3D 노이즈로 각 꼭짓점을 독립적으로 변위<br />
        • <strong>speed</strong> — 변형 속도. 낮으면 느긋한 호흡, 높으면 경련<br />
        • <strong>amplitude</strong> — 변형 크기. 낮으면 구체에 가까움, 높으면 촉수 발생<br />
        • <strong>detail</strong> — 표면 분할 수. 높을수록 부드럽지만 GPU 부하 증가<br />
        • <code>npm: simplex-noise</code> + Three.js (이미 설치됨)
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>속도: {speed.toFixed(1)}</label>
          <input type="range" min={0.1} max={5} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>진폭: {amplitude.toFixed(2)}</label>
          <input type="range" min={0.05} max={0.8} step={0.01} value={amplitude} onChange={(e) => setAmplitude(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>디테일: {detail}</label>
          <input type="range" min={2} max={6} value={detail} onChange={(e) => setDetail(+e.target.value)} />
        </div>
        <div className="lab-control-group">
          <label>컬러</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(COLOR_PRESETS).map(([label, c]) => (
              <button
                key={c}
                title={label}
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, background: c, border: color === c ? '2px solid #fff' : '1px solid #333',
                  borderRadius: 4, cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="lab-canvas lab-canvas-full">
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-3, -3, 2]} intensity={0.5} color="#a29bfe" />
          <MorphingBlob speed={speed} amplitude={amplitude} detail={detail} color={color} />
          <OrbitControls enablePan={false} />
          <Environment preset="night" />
        </Canvas>
      </div>
    </div>
  )
}
