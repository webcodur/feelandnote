'use client'

import { POOL_STYLES, sortBy, type FolderDropState, type SortMode, type ViewMode } from './constants'

/**
 * 📁 서브폴더 섹션 — 실제 물리 폴더 목록과 드래그 앤 드롭으로 이동 UI.
 *
 * 각 폴더 카드를 펼치면 그 폴더 안의 파일을 그리드/리스트로 보여준다.
 * 파일 드롭 시 onMoveFile 을 통해 다른 폴더로 이동시킨다.
 * "루트로 꺼내기" 드롭존은 폴더 밖(루트)으로 빼는 데 쓴다.
 */
export function PoolFolders({
  subFolders, fileFolders, folderFiles, duplicates,
  opened, viewMode, sortMode,
  folderDrop, setFolderDrop, onFolderDrop,
  renderImage,
  toggleOpen,
  onCreateFolder, onRenameFolder, onDeleteFolder, onOpenFolderPath,
}: {
  subFolders: string[]
  fileFolders: Record<string, string>
  folderFiles: Map<string, string[]>
  duplicates: Array<{ name: string; folders: string[] }>
  opened: Set<string>
  viewMode: ViewMode
  sortMode: SortMode
  folderDrop: FolderDropState | null
  setFolderDrop: (s: FolderDropState | null) => void
  onFolderDrop: (e: React.DragEvent, target: string) => void
  renderImage: (fn: string) => React.ReactNode
  toggleOpen: (key: string) => void
  onCreateFolder?: (folderPath: string) => Promise<boolean>
  onRenameFolder?: (folderPath: string, newName: string) => Promise<boolean>
  onDeleteFolder?: (folderPath: string) => Promise<boolean>
  onOpenFolderPath?: (folder: string) => void
}) {
  const handleCreateFolder = async () => {
    if (!onCreateFolder) return
    const raw = window.prompt('새 폴더 이름 (하위 경로는 a/b 형식)')
    if (!raw) return
    const cleaned = raw.trim().replace(/^\/+|\/+$/g, '')
    if (!cleaned) return
    await onCreateFolder(cleaned)
  }

  const handleRenameFolder = async (folderPath: string) => {
    if (!onRenameFolder) return
    const current = folderPath.split('/').pop() ?? folderPath
    const next = window.prompt('새 폴더 이름', current)
    if (!next || next.trim() === current) return
    await onRenameFolder(folderPath, next.trim())
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!onDeleteFolder) return
    if (!window.confirm(`폴더 "${folderPath}" 를 삭제할까? (비어있어야 함)`)) return
    await onDeleteFolder(folderPath)
  }

  return (
    <div className="space-y-1 border border-border/30 rounded p-1.5 bg-bg-main/20">
      <div className="flex items-center justify-between px-1 py-0.5">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">📁 폴더 ({subFolders.length})</span>
        {onCreateFolder && (
          <button
            onClick={handleCreateFolder}
            className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
            title="새 폴더 만들기"
          >+ 새 폴더</button>
        )}
      </div>

      {duplicates.length > 0 && (
        <div className="px-1 py-1 text-[11px] text-red-400 bg-red-500/10 rounded leading-tight">
          ⚠ 이름 중복: {duplicates.map(d => `${d.name} (${d.folders.map(f => f || '루트').join(', ')})`).join(' · ')}
        </div>
      )}

      {subFolders.length === 0 && (
        <div className="px-1 py-2 text-[11px] text-text-secondary italic">폴더 없음 — &quot;+ 새 폴더&quot; 로 만들어라</div>
      )}

      {subFolders.map(folder => {
        const key = `folder:${folder}`
        const isOpen = opened.has(key)
        const files = sortBy(sortMode, folderFiles.get(folder) ?? [])
        const totalInFolder = Object.values(fileFolders).filter(f => f === folder).length
        const dropActive = folderDrop?.folder === folder && folderDrop.active
        return (
          <div
            key={folder}
            className={`border rounded overflow-hidden transition-colors ${dropActive ? 'border-accent ring-1 ring-accent/30 bg-accent/10' : 'border-border/30'}`}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setFolderDrop({ folder, active: true }) }}
            onDragLeave={() => setFolderDrop(null)}
            onDrop={e => onFolderDrop(e, folder)}
          >
            <div className={POOL_STYLES.sectionHeader + ' cursor-pointer'} onClick={() => toggleOpen(key)}>
              <span className={`text-text-secondary text-[11px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-[11px] font-semibold text-text-primary truncate flex-1">📁 {folder} <span className="text-text-secondary font-normal">({files.length}{files.length !== totalInFolder ? `/${totalInFolder}` : ''})</span></span>
              {onOpenFolderPath && (
                <button
                  onClick={e => { e.stopPropagation(); onOpenFolderPath(folder) }}
                  className="text-[11px] text-text-secondary hover:text-accent px-1"
                  title="이 폴더를 탐색기로 열기"
                >📂</button>
              )}
              {onRenameFolder && (
                <button
                  onClick={e => { e.stopPropagation(); handleRenameFolder(folder) }}
                  className="text-[11px] text-text-secondary hover:text-accent px-1"
                  title="이름 변경"
                >✎</button>
              )}
              {onDeleteFolder && (
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteFolder(folder) }}
                  className="text-[11px] text-text-secondary hover:text-red-400 px-1"
                  title="폴더 삭제 (비어있어야 함)"
                >🗑</button>
              )}
            </div>
            {isOpen && (
              <div className="p-1.5">
                {files.length > 0 ? (
                  <div className={viewMode === 'grid' ? POOL_STYLES.gridBody : POOL_STYLES.listBody}>
                    {files.map(renderImage)}
                  </div>
                ) : (
                  <div className="text-[11px] text-text-secondary italic px-1 py-1">비어있음 — 이미지를 여기로 드래그해라</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* 루트로 꺼내기 드롭존 */}
      {subFolders.length > 0 && (
        <div
          className={`mt-1 px-2 py-2 text-[11px] text-center rounded border-2 border-dashed transition-colors ${
            folderDrop?.folder === '' && folderDrop.active
              ? 'border-accent text-accent bg-accent/10'
              : 'border-border/40 text-text-secondary'
          }`}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setFolderDrop({ folder: '', active: true }) }}
          onDragLeave={() => setFolderDrop(null)}
          onDrop={e => onFolderDrop(e, '')}
        >
          ↩︎ 루트로 꺼내기 (여기로 드롭)
        </div>
      )}
    </div>
  )
}
