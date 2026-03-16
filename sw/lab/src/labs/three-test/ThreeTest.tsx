import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4488ff" />
      </mesh>
      <mesh position={[2, 0.35, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#ff4488" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[-2, 0.25, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
        <meshStandardMaterial color="#44ff88" />
      </mesh>
      <Grid infiniteGrid fadeDistance={20} cellColor="#333" sectionColor="#555" />
      <OrbitControls />
      <Environment preset="city" />
    </>
  )
}

export function ThreeTest() {
  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Three.js / R3F 기본</h2>
        <p>기본 도형 + 라이팅 + 환경맵 + OrbitControls. R3F 기본기 확인용.</p>
      </div>
      <div className="lab-info">
        <strong>구성</strong><br />
        • <code>BoxGeometry</code>, <code>SphereGeometry</code>, <code>CylinderGeometry</code> — 기본 도형 3종<br />
        • <code>meshStandardMaterial</code> — PBR 재질 (metalness, roughness)<br />
        • <code>Environment preset="city"</code> — HDRI 환경맵 반사<br />
        • 마우스 드래그로 시점 회전, 스크롤로 줌
      </div>
      <div className="lab-canvas lab-canvas-full">
        <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
          <Scene />
        </Canvas>
      </div>
    </div>
  )
}
