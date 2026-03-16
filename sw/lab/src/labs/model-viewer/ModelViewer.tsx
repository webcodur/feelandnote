import { useState, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Grid, Center } from '@react-three/drei'

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
    <div className="lab-page">
      <div className="lab-header">
        <h2>GLB 모델 뷰어</h2>
        <p>AI 생성 GLB/GLTF 파일을 드래그&드롭으로 미리보기. Replicate, Meshy, Tripo 결과물 확인용.</p>
      </div>

      <div className="lab-info">
        <strong>사용법</strong><br />
        • GLB/GLTF 파일을 아래 영역에 드래그하거나 파일 선택 버튼 클릭<br />
        • <strong>외부 API 워크플로</strong>: Replicate/Meshy/Tripo에서 GLB 다운로드 → 여기서 확인<br />
        • 마우스 드래그 = 회전, 스크롤 = 줌, 우클릭 드래그 = 패닝
      </div>

      {!modelUrl ? (
        <div
          className="lab-canvas"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 400, cursor: 'pointer',
          }}
          onClick={() => document.getElementById('glb-file-input')?.click()}
        >
          <p style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 12 }}>GLB / GLTF 파일을 드래그하거나 클릭</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>AI 생성 3D 모델을 여기서 확인</p>
          <label className="lab-btn" style={{ cursor: 'pointer' }}>
            파일 선택
            <input id="glb-file-input" type="file" accept=".glb,.gltf" onChange={handleFileInput} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <>
          <div className="lab-controls">
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{fileName}</span>
            <button
              className="lab-btn-outline"
              onClick={() => { URL.revokeObjectURL(modelUrl); setModelUrl(null); setFileName('') }}
            >
              교체
            </button>
          </div>
          <div className="lab-canvas lab-canvas-full">
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
          </div>
        </>
      )}
    </div>
  )
}
