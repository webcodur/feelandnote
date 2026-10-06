export function MediaObjectsLab() {
  return (
    <div className="media-live-lab">
      <div className="media-live-lab-bar">
        <span>실제 작품 카드 · 기존 표지 / 실물 형태 비교</span>
        <a href="http://localhost:3000/lab/media-objects" target="_blank" rel="noreferrer">서비스 카드 화면으로 열기 ↗</a>
      </div>
      <iframe title="실제 서비스 작품 카드에 매체별 UI 적용" src="http://localhost:3000/lab/media-objects" />
      <style>{`
        .media-live-lab { background: #050505; min-height: 100vh; }
        .media-live-lab-bar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 18px 24px; font-size: 12px; border-bottom: 1px solid #ffffff14; }
        .media-live-lab-bar a { color: #d4af37; text-decoration: none; }
        .media-live-lab-bar a:hover { color: #ffe39a; text-decoration: underline; }
        .media-live-lab iframe { display: block; width: 100%; min-height: 1300px; height: calc(100vh - 56px); border: 0; }
        @media (max-width: 700px) {
          .app-layout:has(.media-live-lab) { flex-direction: column; }
          .app-layout:has(.media-live-lab) .sidebar { position: static; width: 100%; min-width: 0; padding: 12px 0; border-bottom: 1px solid #ffffff14; }
          .app-layout:has(.media-live-lab) .sidebar-section:not(:has(a[href='/media-objects'])) { display: none; }
          .app-layout:has(.media-live-lab) .main-content { margin-left: 0; min-width: 0; }
        }
      `}</style>
    </div>
  )
}
