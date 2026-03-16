import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { Dashboard } from './Dashboard'
import { ThreeTest } from './labs/three-test/ThreeTest'
import { PhaserTest } from './labs/phaser-test/PhaserTest'
import { ModelViewer } from './labs/model-viewer/ModelViewer'
import { DiceBearLab } from './labs/dicebear/DiceBearLab'
import { BoringAvatarsLab } from './labs/boring-avatars/BoringAvatarsLab'
import { NiceAvatarLab } from './labs/nice-avatar/NiceAvatarLab'
import { CssArtLab } from './labs/css-art/CssArtLab'
import { P5Lab } from './labs/p5-gen/P5Lab'
import { MorphingBlobLab } from './labs/morphing-blob/MorphingBlobLab'
import { VoxelLab } from './labs/voxel/VoxelLab'
import { ParticleLab } from './labs/particle/ParticleLab'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dicebear" element={<DiceBearLab />} />
          <Route path="/boring-avatars" element={<BoringAvatarsLab />} />
          <Route path="/nice-avatar" element={<NiceAvatarLab />} />
          <Route path="/css-art" element={<CssArtLab />} />
          <Route path="/p5" element={<P5Lab />} />
          <Route path="/morphing-blob" element={<MorphingBlobLab />} />
          <Route path="/voxel" element={<VoxelLab />} />
          <Route path="/three" element={<ThreeTest />} />
          <Route path="/phaser" element={<PhaserTest />} />
          <Route path="/model-viewer" element={<ModelViewer />} />
          <Route path="/particle" element={<ParticleLab />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
