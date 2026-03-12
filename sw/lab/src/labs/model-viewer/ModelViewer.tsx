import { useState, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Grid, Center } from '@react-three/drei'
import { Link } from 'react-router-dom'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  )
}

export function ModelViewer() {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!file.name.match(/\.(glb|gltf)$/i)) {
      alert('GLB 또는 GLTF 파일만 지원합니다.')
      return
    }
    if (modelUrl) URL.revokeObjectURL(modelUrl)
    const url = URL.createObjectURL(file)
    setModelUrl(url)
    setFileName(file.name)
  }, [modelUrl])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (modelUrl) URL.revokeObjectURL(modelUrl)
    const url = URL.createObjectURL(file)
    setModelUrl(url)
    setFileName(file.name)
  }, [modelUrl])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
      <Link to="/" style={{ position: 'fixed', top: 12, left: 16, color: '#999', zIndex: 10, textDecoration: 'none', fontSize: 14 }}>
        ← Back
      </Link>

      {!modelUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', color: '#666',
          }}
        >
          <p style={{ fontSize: 20, marginBottom: 16 }}>GLB / GLTF 파일을 드래그하거나 클릭하여 업로드</p>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>AI로 생성한 3D 모델을 여기서 확인하세요</p>
          <label style={{ padding: '10px 24px', background: '#222', border: '1px solid #444', borderRadius: 6, cursor: 'pointer', color: '#ccc' }}>
            파일 선택
            <input type="file" accept=".glb,.gltf" onChange={handleFileInput} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <>
          <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ color: '#999', fontSize: 13 }}>{fileName}</span>
            <button
              onClick={() => { if (modelUrl) URL.revokeObjectURL(modelUrl); setModelUrl(null); setFileName('') }}
              style={{ padding: '4px 12px', background: '#333', border: '1px solid #555', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
            >
              교체
            </button>
          </div>
          <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <Suspense fallback={null}>
              <Model url={modelUrl} />
            </Suspense>
            <Grid infiniteGrid fadeDistance={20} cellColor="#333" sectionColor="#555" />
            <OrbitControls />
            <Environment preset="city" />
          </Canvas>
        </>
      )}
    </div>
  )
}
