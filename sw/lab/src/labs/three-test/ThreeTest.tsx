import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { Link } from 'react-router-dom'

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
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Link to="/" style={{ position: 'fixed', top: 12, left: 16, color: '#999', zIndex: 10, textDecoration: 'none', fontSize: 14 }}>
        ← Back
      </Link>
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  )
}
