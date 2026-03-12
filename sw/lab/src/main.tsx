import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { ThreeTest } from './labs/three-test/ThreeTest'
import { PhaserTest } from './labs/phaser-test/PhaserTest'
import { ModelViewer } from './labs/model-viewer/ModelViewer'

function Home() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', background: '#111', color: '#eee', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Lab</h1>
      <p style={{ color: '#999', marginBottom: 32 }}>3D 모델, 2D 스프라이트, 게임, 영상 테스트 공간</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        <LabCard to="/three" title="Three.js / R3F" desc="3D 씬, 모델 임포트, 라이팅 테스트" />
        <LabCard to="/phaser" title="Phaser 2D Game" desc="2D 게임, 스프라이트, 물리엔진 테스트" />
        <LabCard to="/model-viewer" title="Model Viewer" desc="AI 생성 GLB/GLTF 모델 드래그&드롭 뷰어" />
      </div>
    </div>
  )
}

function LabCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block', padding: 20, background: '#1a1a1a', border: '1px solid #333',
        borderRadius: 8, textDecoration: 'none', color: '#eee', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#666')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
    >
      <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      <p style={{ margin: '8px 0 0', color: '#999', fontSize: 14 }}>{desc}</p>
    </Link>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/three" element={<ThreeTest />} />
        <Route path="/phaser" element={<PhaserTest />} />
        <Route path="/model-viewer" element={<ModelViewer />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
