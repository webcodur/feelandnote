import { Section, TextField, FieldWithDuration } from '../fields'
import { BTN_ADD, BTN_DANGER } from '../constants'
import type { useEpisodeEditor } from '../useEpisodeEditor'

type Ctx = ReturnType<typeof useEpisodeEditor>

export function BooksSection({ ctx }: { ctx: Ctx }) {
  const {
    episode, openSections, openBooks, toggle, toggleBook,
    setBook, setBookStats, addBook, removeBook, moveBook,
    addBookImage, updateBookImage, removeBookImage, moveBookImage,
    onChange,
  } = ctx
  return (
    <Section id="books" title="BOOKS" badge={`${episode.books.length}권`} open={!!openSections.books} onToggle={toggle}>
      <button onClick={addBook} className={BTN_ADD}>+ 책 추가</button>
      <div className="space-y-2">
        {episode.books.map((book, idx) => (
          <div key={idx} className="border border-border rounded-lg overflow-hidden">
            {/* Book header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-card cursor-pointer hover:bg-bg-hover transition-colors"
              onClick={() => toggleBook(idx)}>
              <span className="text-text-dim text-xs">{openBooks[idx] ? '▼' : '▶'}</span>
              <span className="text-xs font-mono text-text-dim w-5">#{idx + 1}</span>
              <span className="text-sm font-semibold flex-1 truncate">{book.title || '(제목 없음)'}</span>
              <span className="text-xs text-text-secondary truncate max-w-32">{book.creator}</span>
              <button onClick={e => { e.stopPropagation(); moveBook(idx, -1) }}
                className="text-text-dim hover:text-text-primary text-xs px-1" title="위로">▲</button>
              <button onClick={e => { e.stopPropagation(); moveBook(idx, 1) }}
                className="text-text-dim hover:text-text-primary text-xs px-1" title="아래로">▼</button>
              <button onClick={e => { e.stopPropagation(); removeBook(idx) }}
                className={BTN_DANGER}>삭제</button>
            </div>
            {/* Book body */}
            {openBooks[idx] && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldWithDuration label="제목" value={book.title} onChange={v => setBook(idx, 'title', v)} duration={book.titleDuration} />
                  <TextField label="저자" value={book.creator} onChange={v => setBook(idx, 'creator', v)} />
                </div>
                <TextField label="썸네일 URL" value={book.thumbnail_url} onChange={v => setBook(idx, 'thumbnail_url', v)} />
                <FieldWithDuration label="요약" value={book.summary} onChange={v => setBook(idx, 'summary', v)}
                  duration={book.summaryDuration} rows={4} />
                <FieldWithDuration label="맥락" value={book.contextMain} onChange={v => setBook(idx, 'contextMain', v)}
                  duration={book.contextDuration} rows={3} />
                {(book.quotePairs ?? []).map((pair, pi) => (
                  <div key={pi} className="space-y-2 pl-3 border-l-2 border-accent/20">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldWithDuration label={`직접 인용${pi > 0 ? ` ${pi + 1}` : ''}`} value={pair.quote} onChange={v => {
                        const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], quote: v }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                      }} duration={pair.quoteDuration} />
                      <TextField label="인용 출처" value={pair.quoteSource ?? ''} onChange={v => {
                        const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], quoteSource: v || undefined }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                      }} />
                    </div>
                    <FieldWithDuration label={`후속 맥락${pi > 0 ? ` ${pi + 1}` : ''}`} value={pair.after ?? ''} onChange={v => {
                      const books = [...episode.books]; const pairs = [...(books[idx].quotePairs ?? [])]; pairs[pi] = { ...pairs[pi], after: v || undefined }; books[idx] = { ...books[idx], quotePairs: pairs }; onChange({ ...episode, books })
                    }} duration={pair.afterDuration} rows={2} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="출판년도" value={book.stats.publishYear ?? ''} onChange={v => setBookStats(idx, 'publishYear', v)} />
                  <TextField label="출처 URL" value={book.source ?? ''} onChange={v => setBook(idx, 'source', v)} />
                </div>

                {/* 시네마틱 이미지 */}
                <div className="border-t border-border pt-3 mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-secondary font-medium">IMAGES</span>
                    <span className="text-[10px] text-text-dim">{book.images?.length ?? 0}장</span>
                    <div className="flex-1" />
                    <button onClick={() => addBookImage(idx)} className={BTN_ADD}>+ 이미지</button>
                  </div>
                  {(book.images ?? []).map((img, iIdx) => (
                    <div key={iIdx} className="border border-border rounded p-2 space-y-1.5 bg-bg-card">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-dim w-5">#{iIdx + 1}</span>
                        <label className="text-[10px] text-text-secondary shrink-0">file</label>
                        <input value={img.file} onChange={e => updateBookImage(idx, iIdx, 'file', e.target.value)}
                          className="w-28 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                          placeholder="1-1.jpg" />
                        <label className="text-[10px] text-text-secondary shrink-0">keyword</label>
                        <input value={img.keyword ?? ''} onChange={e => updateBookImage(idx, iIdx, 'keyword', e.target.value)}
                          className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                          placeholder="키워드" />
                        <button onClick={() => moveBookImage(idx, iIdx, -1)}
                          className="text-text-dim hover:text-text-primary text-[10px] px-0.5" title="위로">▲</button>
                        <button onClick={() => moveBookImage(idx, iIdx, 1)}
                          className="text-text-dim hover:text-text-primary text-[10px] px-0.5" title="아래로">▼</button>
                        <button onClick={() => removeBookImage(idx, iIdx)}
                          className="text-danger text-xs hover:opacity-70" title="삭제">✕</button>
                      </div>
                      <div className="flex items-center gap-2 pl-7">
                        <label className="text-[10px] text-text-secondary shrink-0 w-8">text</label>
                        <input value={img.text ?? ''} onChange={e => updateBookImage(idx, iIdx, 'text', e.target.value)}
                          className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                          placeholder={iIdx === 0 ? '(첫 이미지 — 섹션 시작부터 표시)' : '나레이션 텍스트 앵커'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
