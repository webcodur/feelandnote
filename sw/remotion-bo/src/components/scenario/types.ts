export type CinematicImage = {
  file: string
  text?: string
  /** summary = 책 장면, context = 인물 배경, quote = 직접 인용 전용 장면
   *  context main/after 세부 위치는 text 앵커가 결정. quote는 직접 배정된 영역 */
  field?: 'summary' | 'context' | 'quote'
  keyword?: string
  prompt?: string
  ko?: string
}

export type ImageField = 'summary' | 'context' | 'quote'

export type VoiceInfo = {
  sectionKey: string
  duration?: number
  exists: boolean
}

export type AnchorPick = {
  itemIdx: number
  imgIdx: number
  draft: string | null
  field?: ImageField
} | null

export const ROLE_COLORS: Record<string, string> = {
  narrator: 'text-[#888]',
  summary: 'text-[#8bb8a8]',
  celeb: 'text-[#c8a46e]',
}

export const ROLE_LABELS: Record<string, string> = {
  narrator: '나레이터',
  summary: '요약맨',
  celeb: '셀럽',
}

export const ENGINE_COLORS: Record<string, string> = {
  gemini: 'text-blue-400',
  elevenlabs: 'text-purple-400',
  common: 'text-teal-400',
}

export const ENGINE_LABELS: Record<string, string> = {
  gemini: 'GEM',
  elevenlabs: 'ELE',
  common: 'CMN',
}

/* ── 공통 이미지 핸들러 props ── */
export type ImageEditorProps = {
  anchorPick: AnchorPick; setAnchorPick: (p: AnchorPick) => void
  imageBaseUrl: string
  folderImages: string[]     // 에피소드 폴더 전체 이미지 (shorts- prefix 포함)
  usedFiles: Set<string>     // 롱폼/모든 쇼츠에서 사용 중인 파일명 (shorts 구간 image + revealBg + 롱폼 books.images 파일명)
  fileBookMap: Map<string, number>  // 파일명 → 사용 책 인덱스 (0-based). 롱폼 books.images 기준
  fileFieldMap: Map<string, ImageField>  // 파일명 → 저장된 field (summary|context|quote). 롱폼 books.images 기준
  refreshFolderImages: () => void
  view: string               // 'longform' | 'shorts-<n>' — 필터 적용 영역 결정
  getImages: (idx: number) => CinematicImage[]
  removeImage: (idx: number, imgIdx: number) => void
  removeImageOnly: (idx: number, imgIdx: number) => void
  replaceImage: (idx: number, imgIdx: number, fileName: string) => void
  addAnchor: (idx: number, text: string, field?: ImageField) => void
  dropImage: (idx: number, fileName: string, field?: ImageField) => void
  handlePick: (selected: string, field?: ImageField) => void
  confirmAnchor: () => void
  /** 파일별 전체 사용 현황 (파일명 → 위치 설명 목록). 롱폼·모든 쇼츠 위치를 수집한다. */
  crossUsage?: Map<string, string[]>
  /** 물리 서브폴더 상대경로 목록 (다중 깊이 '/' 구분). 빈 배열이면 루트에만 파일이 있음. */
  subFolders: string[]
  /** 파일명 → 폴더 상대경로 ('' = 루트) */
  fileFolders: Record<string, string>
  /** 파일명 중복 (여러 폴더에 같은 이름) — 경고 표시용 */
  duplicates: Array<{ name: string; folders: string[] }>
  /** 파일을 서브폴더로 이동. targetFolder='' = 루트. 성공 시 true */
  moveFileToFolder: (fileName: string, targetFolder: string) => Promise<boolean>
  /** 서브폴더 생성 — 상대경로 'bg' 또는 'a/b' 등 */
  createFolder: (folderPath: string) => Promise<boolean>
  /** 서브폴더 이름 변경 — 마지막 세그먼트만 교체 */
  renameFolder: (folderPath: string, newName: string) => Promise<boolean>
  /** 서브폴더 삭제 — 비어있을 때만 */
  deleteFolder: (folderPath: string) => Promise<boolean>
}
