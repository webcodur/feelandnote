import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

type VoxelDef = [number, number, number, string]

const PRESETS: Record<string, { label: string; desc: string; voxels: VoxelDef[] }> = {
  warrior: {
    label: '전사',
    desc: '투구 + 갑옷 + 검',
    voxels: [
      // Head (skin)
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0],[0,9,0]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      // Helmet
      ...[[-1,9,0],[1,9,0],[-2,8,0],[2,8,0],[0,10,0]].map(([x,y,z]) => [x,y,z,'#b0b0b0'] as VoxelDef),
      // Eyes
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      // Body (armor)
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#4a3db8'] as VoxelDef),
      // Belt
      ...[[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#f1c40f'] as VoxelDef),
      // Arms
      ...[[-2,6,0],[-2,5,0],[-2,4,0],[2,6,0],[2,5,0],[2,4,0]].map(([x,y,z]) => [x,y,z,'#4a3db8'] as VoxelDef),
      // Sword (right hand)
      ...[[3,4,0],[3,5,0],[3,6,0],[3,7,0],[3,8,0]].map(([x,y,z]) => [x,y,z,'#dfe6e9'] as VoxelDef),
      // Legs
      ...[[-1,3,0],[-1,2,0],[-1,1,0],[1,3,0],[1,2,0],[1,1,0]].map(([x,y,z]) => [x,y,z,'#636e72'] as VoxelDef),
      // Boots
      ...[[-1,0,0],[-1,0,1],[1,0,0],[1,0,1]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
    ],
  },
  scholar: {
    label: '학자',
    desc: '두루마기 + 책',
    voxels: [
      // Head
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0],[0,9,0],[-1,9,0],[1,9,0]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      // Hair
      ...[[-1,10,0],[0,10,0],[1,10,0],[-2,9,0],[2,9,0]].map(([x,y,z]) => [x,y,z,'#636e72'] as VoxelDef),
      // Eyes + glasses
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      // Robe
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0],[-1,3,0],[0,3,0],[1,3,0],[-2,3,0],[2,3,0]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      // Arms with sleeves
      ...[[-2,6,0],[-2,5,0],[-3,4,0],[2,6,0],[2,5,0],[3,4,0]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      // Book (left hand)
      ...[[-3,5,0],[-3,5,1],[-4,5,0],[-4,5,1]].map(([x,y,z]) => [x,y,z,'#c0392b'] as VoxelDef),
      // Legs (hidden under robe, just feet)
      ...[[-1,2,0],[1,2,0],[-1,1,0],[1,1,0],[-1,0,0],[1,0,0]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
    ],
  },
  emperor: {
    label: '황제',
    desc: '왕관 + 로브 + 홀',
    voxels: [
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      ...[[-1,9,0],[0,9,0],[1,9,0],[0,10,0],[-1,10,0],[1,10,0]].map(([x,y,z]) => [x,y,z,'#f1c40f'] as VoxelDef),
      ...[[0,10,1]].map(([x,y,z]) => [x,y,z,'#e74c3c'] as VoxelDef),
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0],[-2,4,0],[2,4,0],[-2,3,0],[-1,3,0],[0,3,0],[1,3,0],[2,3,0]].map(([x,y,z]) => [x,y,z,'#6c3483'] as VoxelDef),
      ...[[-1,6,1],[0,6,1],[1,6,1]].map(([x,y,z]) => [x,y,z,'#f1c40f'] as VoxelDef),
      ...[[-2,6,0],[-2,5,0],[2,6,0],[2,5,0]].map(([x,y,z]) => [x,y,z,'#6c3483'] as VoxelDef),
      ...[[3,5,0],[3,6,0],[3,7,0],[3,8,0]].map(([x,y,z]) => [x,y,z,'#f1c40f'] as VoxelDef),
      [[3,9,0,'#e74c3c'] as VoxelDef][0],
      ...[[-1,2,0],[-1,1,0],[-1,0,0],[1,2,0],[1,1,0],[1,0,0]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
    ],
  },
  archer: {
    label: '궁수',
    desc: '후드 + 활',
    voxels: [
      // Head
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      // Hood
      ...[[-1,9,0],[0,9,0],[1,9,0],[0,10,0],[-1,9,-1],[0,9,-1],[1,9,-1]].map(([x,y,z]) => [x,y,z,'#2e7d32'] as VoxelDef),
      // Eyes
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#2d3436'] as VoxelDef),
      // Tunic
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#2e7d32'] as VoxelDef),
      // Belt
      ...[[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#795548'] as VoxelDef),
      // Arms
      ...[[-2,6,0],[-2,5,0],[2,6,0],[2,5,0]].map(([x,y,z]) => [x,y,z,'#2e7d32'] as VoxelDef),
      // Bow (left hand)
      ...[[-3,4,0],[-3,5,0],[-3,6,0],[-3,7,0],[-3,8,0]].map(([x,y,z]) => [x,y,z,'#795548'] as VoxelDef),
      // Bowstring
      ...[[-3,4,1],[-3,6,1],[-3,8,1]].map(([x,y,z]) => [x,y,z,'#dfe6e9'] as VoxelDef),
      // Quiver (back)
      ...[[0,6,-1],[0,5,-1],[0,7,-1]].map(([x,y,z]) => [x,y,z,'#795548'] as VoxelDef),
      // Arrow tips
      ...[[0,8,-1]].map(([x,y,z]) => [x,y,z,'#b0b0b0'] as VoxelDef),
      // Legs
      ...[[-1,3,0],[-1,2,0],[-1,1,0],[1,3,0],[1,2,0],[1,1,0]].map(([x,y,z]) => [x,y,z,'#5d4037'] as VoxelDef),
      // Boots
      ...[[-1,0,0],[-1,0,1],[1,0,0],[1,0,1]].map(([x,y,z]) => [x,y,z,'#3e2723'] as VoxelDef),
    ],
  },
  mage: {
    label: '마법사',
    desc: '뾰족 모자 + 지팡이',
    voxels: [
      // Head
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      // Wizard hat
      ...[[-1,9,0],[0,9,0],[1,9,0],[-2,9,0],[2,9,0],[0,10,0],[0,11,0],[0,12,0]].map(([x,y,z]) => [x,y,z,'#1a237e'] as VoxelDef),
      // Hat star
      ...[[0,11,1]].map(([x,y,z]) => [x,y,z,'#ffd700'] as VoxelDef),
      // Eyes (glowing)
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#00e5ff'] as VoxelDef),
      // Robe
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0],[-1,3,0],[0,3,0],[1,3,0],[-2,3,0],[2,3,0],[-2,2,0],[2,2,0]].map(([x,y,z]) => [x,y,z,'#1a237e'] as VoxelDef),
      // Robe trim
      ...[[-2,2,0],[-1,2,0],[0,2,0],[1,2,0],[2,2,0]].map(([x,y,z]) => [x,y,z,'#ffd700'] as VoxelDef),
      // Arms
      ...[[-2,6,0],[-2,5,0],[2,6,0],[2,5,0]].map(([x,y,z]) => [x,y,z,'#1a237e'] as VoxelDef),
      // Staff (right hand)
      ...[[3,3,0],[3,4,0],[3,5,0],[3,6,0],[3,7,0],[3,8,0],[3,9,0]].map(([x,y,z]) => [x,y,z,'#5d4037'] as VoxelDef),
      // Staff orb
      ...[[3,10,0]].map(([x,y,z]) => [x,y,z,'#e040fb'] as VoxelDef),
      // Feet
      ...[[-1,1,0],[-1,0,0],[1,1,0],[1,0,0]].map(([x,y,z]) => [x,y,z,'#1a237e'] as VoxelDef),
    ],
  },
  knight: {
    label: '기사',
    desc: '전신 갑옷 + 방패',
    voxels: [
      // Head
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0]].map(([x,y,z]) => [x,y,z,'#b0b0b0'] as VoxelDef),
      // Helmet visor
      ...[[-1,8,1],[0,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#424242'] as VoxelDef),
      // Helmet plume
      ...[[0,9,0],[0,10,0]].map(([x,y,z]) => [x,y,z,'#c62828'] as VoxelDef),
      // Full plate armor
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#9e9e9e'] as VoxelDef),
      // Chest emblem
      ...[[0,6,1]].map(([x,y,z]) => [x,y,z,'#1565c0'] as VoxelDef),
      // Arms (armored)
      ...[[-2,6,0],[-2,5,0],[-2,4,0],[2,6,0],[2,5,0],[2,4,0]].map(([x,y,z]) => [x,y,z,'#9e9e9e'] as VoxelDef),
      // Shield (left)
      ...[[-3,5,1],[-3,6,1],[-3,4,1],[-3,5,0],[-3,6,0],[-3,4,0]].map(([x,y,z]) => [x,y,z,'#1565c0'] as VoxelDef),
      // Shield emblem
      ...[[-3,5,2]].map(([x,y,z]) => [x,y,z,'#ffd700'] as VoxelDef),
      // Sword (right)
      ...[[3,4,0],[3,5,0],[3,6,0],[3,7,0],[3,8,0]].map(([x,y,z]) => [x,y,z,'#e0e0e0'] as VoxelDef),
      // Sword guard
      ...[[2,4,0],[4,4,0]].map(([x,y,z]) => [x,y,z,'#ffd700'] as VoxelDef),
      // Legs (armored)
      ...[[-1,3,0],[-1,2,0],[-1,1,0],[1,3,0],[1,2,0],[1,1,0]].map(([x,y,z]) => [x,y,z,'#757575'] as VoxelDef),
      // Boots
      ...[[-1,0,0],[-1,0,1],[1,0,0],[1,0,1]].map(([x,y,z]) => [x,y,z,'#616161'] as VoxelDef),
    ],
  },
  ninja: {
    label: '닌자',
    desc: '두건 + 수리검',
    voxels: [
      // Head (masked)
      ...[[-1,7,0],[0,7,0],[1,7,0],[-1,8,0],[0,8,0],[1,8,0],[0,9,0]].map(([x,y,z]) => [x,y,z,'#212121'] as VoxelDef),
      // Eyes only visible
      ...[[-1,8,1],[1,8,1]].map(([x,y,z]) => [x,y,z,'#e0c4a8'] as VoxelDef),
      // Body (dark suit)
      ...[[-1,6,0],[0,6,0],[1,6,0],[-1,5,0],[0,5,0],[1,5,0],[-1,4,0],[0,4,0],[1,4,0]].map(([x,y,z]) => [x,y,z,'#212121'] as VoxelDef),
      // Sash
      ...[[0,5,1]].map(([x,y,z]) => [x,y,z,'#c62828'] as VoxelDef),
      // Arms
      ...[[-2,6,0],[-2,5,0],[2,6,0],[2,5,0]].map(([x,y,z]) => [x,y,z,'#212121'] as VoxelDef),
      // Shuriken (right hand)
      ...[[3,5,0],[3,5,1],[3,5,-1],[2,5,0],[4,5,0]].map(([x,y,z]) => [x,y,z,'#b0b0b0'] as VoxelDef),
      // Katana (back)
      ...[[0,5,-1],[0,6,-1],[0,7,-1],[0,8,-1],[0,9,-1]].map(([x,y,z]) => [x,y,z,'#424242'] as VoxelDef),
      // Katana handle
      ...[[0,4,-1]].map(([x,y,z]) => [x,y,z,'#795548'] as VoxelDef),
      // Legs
      ...[[-1,3,0],[-1,2,0],[-1,1,0],[1,3,0],[1,2,0],[1,1,0]].map(([x,y,z]) => [x,y,z,'#212121'] as VoxelDef),
      // Tabi boots
      ...[[-1,0,0],[-1,0,1],[1,0,0],[1,0,1]].map(([x,y,z]) => [x,y,z,'#424242'] as VoxelDef),
    ],
  },
}

function VoxelCharacter({ voxels, voxelSize }: { voxels: VoxelDef[]; voxelSize: number }) {
  // Simple approach: individual meshes (fine for small voxel counts)
  return (
    <group>
      {voxels.map(([x, y, z, color], i) => (
        <mesh key={i} position={[x * voxelSize, y * voxelSize, z * voxelSize]}>
          <boxGeometry args={[voxelSize * 0.92, voxelSize * 0.92, voxelSize * 0.92]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

export function VoxelLab() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('warrior')
  const [voxelSize, setVoxelSize] = useState(0.3)
  const p = PRESETS[preset]

  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Voxel Character</h2>
        <p>좌표 배열로 인체 구조 정의. 마인크래프트풍 복셀 캐릭터를 코드만으로 조형.</p>
      </div>

      <div className="lab-info">
        <strong>원리</strong><br />
        • 각 복셀 = <code>[x, y, z, color]</code> 튜플. 좌표만 나열하면 캐릭터 완성<br />
        • <code>BoxGeometry</code>를 좌표마다 배치. 색상별 그룹핑<br />
        • 프리셋을 JSON으로 관리하면 인물별 복셀 캐릭터 DB 구축 가능<br />
        • 에셋 파일 불필요. 코드가 곧 조형 데이터<br />
        • <strong>확장</strong> — InstancedMesh로 대량 렌더, 애니메이션 추가 가능
      </div>

      <div className="lab-controls">
        <div className="lab-control-group">
          <label>프리셋</label>
          <select className="lab-select" value={preset} onChange={(e) => setPreset(e.target.value as keyof typeof PRESETS)}>
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{val.label} — {val.desc}</option>
            ))}
          </select>
        </div>
        <div className="lab-control-group">
          <label>복셀 크기: {voxelSize.toFixed(2)}</label>
          <input type="range" min={0.15} max={0.5} step={0.01} value={voxelSize} onChange={(e) => setVoxelSize(+e.target.value)} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
          복셀 수: {p.voxels.length}개
        </div>
      </div>

      <div className="lab-canvas lab-canvas-full">
        <Canvas camera={{ position: [4, 4, 6], fov: 40 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
          <pointLight position={[-3, 2, 4]} intensity={0.3} color="#a29bfe" />
          <group position={[0, -1.5, 0]}>
            <VoxelCharacter voxels={p.voxels} voxelSize={voxelSize} />
          </group>
          <OrbitControls />
          <Environment preset="night" />
        </Canvas>
      </div>

      {/* All presets side by side */}
      <div style={{ marginTop: 24, marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-dim)' }}>
        전체 프리셋 비교
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Object.entries(PRESETS).map(([key, val]) => (
          <div
            key={key}
            className="lab-canvas"
            style={{
              height: 280, cursor: 'pointer',
              borderColor: key === preset ? 'var(--accent)' : undefined,
            }}
            onClick={() => setPreset(key as keyof typeof PRESETS)}
          >
            <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 12, color: 'var(--text-dim)', zIndex: 1 }}>
              {val.label}
            </div>
            <Canvas camera={{ position: [4, 4, 6], fov: 40 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 8, 5]} intensity={1} />
              <group position={[0, -1.5, 0]}>
                <VoxelCharacter voxels={val.voxels} voxelSize={0.3} />
              </group>
              <OrbitControls enableZoom={false} />
              <Environment preset="night" />
            </Canvas>
          </div>
        ))}
      </div>
    </div>
  )
}
