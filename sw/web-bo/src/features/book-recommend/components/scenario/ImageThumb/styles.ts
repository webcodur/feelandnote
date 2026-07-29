// 썸네일 hover 시 우상단 액션 아이콘 공통 스타일
// 그룹 이름(group/pool, group/thumb, group/row)은 호출부에서 지정한다.
const ACTION_BTN_BASE = 'w-5 h-5 flex items-center justify-center rounded-full bg-black/80 text-sm font-bold'
export const ACTION_BTN_POOL = `${ACTION_BTN_BASE} opacity-0 group-hover/pool:opacity-100`
export const ACTION_BTN_THUMB = `${ACTION_BTN_BASE} opacity-0 group-hover/thumb:opacity-100`

// 색상 바리에이션
export const ACTION_BTN_DELETE = 'text-red-400 hover:text-red-200 hover:bg-red-500/80'
export const ACTION_BTN_LOCATE = 'text-accent hover:text-accent-hover hover:bg-accent/20'
export const ACTION_BTN_AMBER = 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/80'

// 한 리스트행 인라인 텍스트 액션 (hover 시 노출)
export const ROW_ACTION = 'text-[11px] shrink-0 opacity-0 group-hover/row:opacity-100'

// used 뱃지 (양 썸네일 공용)
export const USED_BADGE_ABS = 'absolute top-0.5 left-0.5 px-1 py-px text-[11px] font-semibold rounded bg-blue-500/70 text-white'
export const USED_BADGE_INLINE = 'text-[11px] font-semibold rounded bg-blue-500/70 text-white px-1 shrink-0'
