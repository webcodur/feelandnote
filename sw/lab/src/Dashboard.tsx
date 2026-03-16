import { Link } from 'react-router-dom'

const LABS = [
  {
    section: 'SVG 조형 — 코드만으로 즉시 캐릭터 생성',
    items: [
      {
        to: '/dicebear',
        title: 'DiceBear Avatars',
        desc: '30+ 스타일의 결정론적 SVG 아바타. 시드 문자열만 넣으면 동일 인물 = 동일 캐릭터. 전신 지원.',
        tag: 'svg',
      },
      {
        to: '/boring-avatars',
        title: 'Boring Avatars',
        desc: '6가지 기하학적 아바타 변형. 이름 기반 결정론적 생성. 컬러 팔레트 커스텀.',
        tag: 'svg',
      },
      {
        to: '/nice-avatar',
        title: 'Nice Avatar',
        desc: '애니메이션풍 SVG 캐릭터. 헤어, 눈, 입, 옷 등 파라미터 제어 가능.',
        tag: 'svg',
      },
    ],
  },
  {
    section: '2D 조형 — 캔버스, CSS, 제너레이티브',
    items: [
      {
        to: '/css-art',
        title: 'CSS-only Art',
        desc: '의존성 제로. gradient, clip-path, box-shadow만으로 캐릭터 조형. 브라우저 네이티브.',
        tag: '2d',
      },
      {
        to: '/p5',
        title: 'p5.js 제너레이티브',
        desc: 'Perlin noise 기반 유기적 형상 생성. 코드 몇 줄로 자연스러운 생명체 패턴.',
        tag: '2d',
      },
      {
        to: '/phaser',
        title: 'Phaser 2D Game',
        desc: '2D 게임 엔진. 물리, 스프라이트, 충돌 처리. 기존 데모 플랫포머.',
        tag: '2d',
      },
    ],
  },
  {
    section: '3D 조형 — Three.js / R3F 기반 프로시저럴',
    items: [
      {
        to: '/morphing-blob',
        title: 'Morphing Blob',
        desc: 'Simplex noise로 구체를 실시간 변형. 유기적 생명체/크리처. 파라미터로 형태 제어.',
        tag: '3d',
      },
      {
        to: '/voxel',
        title: 'Voxel Character',
        desc: '마인크래프트풍 복셀 캐릭터. 좌표 배열로 인체 정의. 색상·크기 커스텀.',
        tag: '3d',
      },
      {
        to: '/three',
        title: 'Three.js 기본',
        desc: '기본 도형 + 라이팅 + 환경맵. R3F 기본기 확인.',
        tag: '3d',
      },
      {
        to: '/model-viewer',
        title: 'GLB 모델 뷰어',
        desc: 'AI 생성 GLB/GLTF 파일 드래그&드롭 미리보기. Replicate/Meshy 결과물 확인용.',
        tag: '3d',
      },
    ],
  },
  {
    section: '프로시저럴 이펙트',
    items: [
      {
        to: '/particle',
        title: 'Particle System',
        desc: '수천 파티클이 형상을 구성/해체. 등장·퇴장 연출에 활용.',
        tag: 'proc',
      },
    ],
  },
]

export function Dashboard() {
  return (
    <div className="lab-page">
      <div className="lab-header">
        <h2>Figurine Lab — 인물 조형 실험실</h2>
        <p>
          개발자 명령만으로 2D·3D·SVG 캐릭터 조형을 생성하고 비교한다.
          아트/디자인 지식 불필요. 각 랩에서 파라미터를 조작하며 결과를 즉시 확인한다.
        </p>
      </div>

      <div className="lab-info">
        <strong>테스트 순서 가이드</strong><br />
        ① SVG — 가장 빠르고 무료. 시드 기반 결정론적 생성 확인<br />
        ② 2D — CSS-only, p5.js로 프로시저럴 조형 가능성 탐색<br />
        ③ 3D — Morphing Blob, Voxel로 Three.js 프로시저럴 캐릭터<br />
        ④ 프로시저럴 이펙트 — 파티클 시스템으로 연출 가능성 확인<br />
        ⑤ 외부 API — Replicate, Meshy 등 텍스트→GLB 생성은 ModelViewer로 결과 확인
      </div>

      {LABS.map((section) => (
        <div key={section.section} className="home-section">
          <div className="home-section-title">{section.section}</div>
          <div className="home-grid">
            {section.items.map((item) => (
              <Link key={item.to} to={item.to} className="home-card">
                <h3>
                  {item.title}
                  <span className={`sidebar-tag tag-${item.tag}`}>{item.tag.toUpperCase()}</span>
                </h3>
                <p>{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
