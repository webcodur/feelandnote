import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  {
    section: 'SVG 조형',
    items: [
      { to: '/dicebear', label: 'DiceBear Avatars', tag: 'svg' },
      { to: '/boring-avatars', label: 'Boring Avatars', tag: 'svg' },
      { to: '/nice-avatar', label: 'Nice Avatar', tag: 'svg' },
    ],
  },
  {
    section: '2D 조형',
    items: [
      { to: '/css-art', label: 'CSS-only Art', tag: '2d' },
      { to: '/p5', label: 'p5.js 제너레이티브', tag: '2d' },
      { to: '/phaser', label: 'Phaser 2D Game', tag: '2d' },
    ],
  },
  {
    section: '3D 조형',
    items: [
      { to: '/morphing-blob', label: 'Morphing Blob', tag: '3d' },
      { to: '/voxel', label: 'Voxel Character', tag: '3d' },
      { to: '/three', label: 'Three.js 기본', tag: '3d' },
      { to: '/model-viewer', label: 'GLB 모델 뷰어', tag: '3d' },
    ],
  },
  {
    section: '프로시저럴',
    items: [
      { to: '/particle', label: 'Particle System', tag: 'proc' },
    ],
  },
]

export function Layout() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>Figurine Lab</h1>
          <p>인물 조형 실험 공간</p>
        </div>

        <div className="sidebar-section">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            대시보드
          </NavLink>
        </div>

        {NAV.map((group) => (
          <div key={group.section} className="sidebar-section">
            <div className="sidebar-section-title">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                {item.label}
                <span className={`sidebar-tag tag-${item.tag}`}>{item.tag.toUpperCase()}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
