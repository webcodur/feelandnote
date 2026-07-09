import { useState, useRef, Fragment } from 'react'


/**
 * Faction 전용 텍스트 에디터 (Chunk/Line 기반 앵커)
 * 텍스트 하이라이팅이 아닌, 줄(Chunk) 사이에 가로선(Divider)을 그어 이미지 전환 시점을 직관적으로 보여줍니다.
 */
export function FactionQuoteEditor({
  value,
  onChange,
  onAddAnchor,
  onRemoveAnchor,
  onMoveAnchor,
  placeholder,
  highlights = new Set<number>(),
  className = '',
}: {
  value: string
  onChange: (val: string) => void
  onAddAnchor?: (chunkIndex: number) => void
  onRemoveAnchor?: (chunkIndex: number) => void
  onMoveAnchor?: (fromIndex: number, toIndex: number) => void
  placeholder?: string
  highlights?: Set<number>
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [cursorChunkIndex, setCursorChunkIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const chunks = value ? value.split('\n') : ['']
  
  const updateCursor = () => {
    if (!ref.current) return
    const { selectionStart } = ref.current
    const chunkIndex = value.slice(0, selectionStart).split('\n').length - 1
    setCursorChunkIndex(chunkIndex)
  }

  const handleAddAnchor = (e: React.MouseEvent, chunkIndex: number) => {
    e.preventDefault()
    if (onAddAnchor) onAddAnchor(chunkIndex)
  }

  return (
    <div className="relative">
      {/* 오버레이 (Divider 및 액션 버튼 렌더링) */}
      <div
        aria-hidden
        className={`absolute inset-0 px-2.5 py-1.5 font-semibold text-[14.5px] leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words z-10 ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverIndex(null)
          }
        }}
        onDrop={() => {
          setDragOverIndex(null)
          setIsDragging(false)
        }}
      >
        {chunks.map((chunk, i) => {
          const hasAnchor = highlights.has(i)
          const isCursorHere = focused && cursorChunkIndex === i
          const isDragOver = dragOverIndex === i
          
          return (
            <div 
              key={i} 
              className="relative"
              onDragOver={(e) => { 
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverIndex !== i) setDragOverIndex(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverIndex(null)
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                if (!isNaN(fromIdx) && fromIdx !== i && onMoveAnchor) {
                  onMoveAnchor(fromIdx, i)
                }
              }}
            >
              {/* 드래그 오버 시 가상 가로선 (Drop Target Indicator) */}
              {isDragOver && (
                <div className="absolute top-0 left-0 right-0 border-t-2 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] z-20 pointer-events-none"></div>
              )}

              {/* 이미지가 걸린 청크: 상단에 굵은 가로선(Divider)과 라벨 표시 */}
              {hasAnchor && i > 0 && (
                <div className="absolute top-0 left-0 right-14 border-t-2 border-amber-400 border-dashed pointer-events-auto">
                  <div 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', i.toString())
                      e.dataTransfer.effectAllowed = 'move'
                      setIsDragging(true)
                    }}
                    onDragEnd={() => {
                      setDragOverIndex(null)
                      setIsDragging(false)
                    }}
                    className="absolute right-0 -top-2.5 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 pl-1.5 pr-1 py-0.5 rounded-sm shadow-sm leading-tight cursor-grab active:cursor-grabbing hover:bg-amber-200 transition-colors"
                    title="드래그하여 다른 줄로 이동하거나, 클릭하여 삭제할 수 있습니다."
                  >
                    <span>🖼 이미지 전환</span>
                    {onRemoveAnchor && (
                      <button 
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveAnchor(i) }}
                        className="ml-1 text-amber-500 hover:text-red-500 rounded-full hover:bg-white/50 w-3 h-3 flex items-center justify-center transition-colors"
                        title="전환 앵커 삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* 이미지가 없는 청크 중, 현재 커서가 있는 줄: 우측에 추가 버튼 표시 */}
              {!hasAnchor && isCursorHere && onAddAnchor && i > 0 && (
                <div className="absolute top-0 left-0 right-0 pointer-events-none group">
                  <div className="absolute top-0 left-0 right-14 border-t-2 border-border/50 border-dashed group-hover:border-amber-400 transition-colors"></div>
                  <div className="absolute top-0 right-0 pointer-events-auto">
                    <button
                      type="button"
                      onMouseDown={(e) => handleAddAnchor(e, i)}
                      className="flex items-center gap-1 -mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-bg-secondary border border-border text-text-secondary hover:bg-amber-100 hover:border-amber-400 hover:text-amber-800 shadow-sm transition-colors peer"
                      title="이 줄이 시작될 때 새로운 이미지로 전환합니다."
                    >
                      <span>＋ 전환</span>
                    </button>
                  </div>
                </div>
              )}
              
              <span className="text-transparent">{chunk || ' '}</span>
              {i < chunks.length - 1 ? '\n' : ''}
            </div>
          )
        })}
      </div>
      
      {/* 실제 입력창 */}
      <textarea
        ref={ref}
        value={value}
        onChange={e => { onChange(e.target.value); updateCursor() }}
        onFocus={() => { setFocused(true); updateCursor() }}
        onBlur={() => { setFocused(false); setCursorChunkIndex(null) }}
        onKeyUp={updateCursor}
        onMouseUp={updateCursor}
        placeholder={placeholder}
        rows={1}
        spellCheck={false}
        // 우측에 액션 버튼이 들어갈 공간(pr-16)을 확보하여 텍스트가 겹치지 않게 함
        className={`relative w-full font-semibold text-[14.5px] leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words bg-transparent border border-transparent pl-2.5 pr-16 py-1.5 resize-none outline-none [field-sizing:content] caret-text-primary ${focused ? 'text-text-primary' : className} focus:ring-2 focus:ring-accent/20 rounded-md`}
      />
    </div>
  )
}
