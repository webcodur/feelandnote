'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Download, ExternalLink, ImagePlus, Save, Trash2, Upload } from 'lucide-react'
import { toSceneImages, type FactionTeamImage, type FactionSceneEnding } from '@feelandnote/shared/lib/faction-team-image'
import { saveSceneArtwork, uploadSceneArtwork, type SceneEditorData } from '@/actions/admin/faction-scenes'
import { SCENE_UPLOAD_MAX_BYTES, validateSceneDraft } from '@/lib/faction-scene-editor'
import { SceneEndingFields, SceneTextFields } from './SceneTextFields'
import { SCENE_BUTTON, SCENE_INPUT } from './styles'

const emptyEnding: FactionSceneEnding = { title: '', text: '', titleEn: '', textEn: '' }
const withoutEnding = (image: FactionTeamImage) => { const copy = { ...image }; delete copy.ending; return copy }

export default function SceneEditor({ data }: { data: SceneEditorData }) {
  const router = useRouter()
  const [scenes, setScenes] = useState(data.scenes.map(withoutEnding))
  const [cover, setCover] = useState(data.cover)
  const [ending, setEnding] = useState(data.scenes.at(-1)?.ending ?? emptyEnding)
  const [hasEnding, setHasEnding] = useState(!!data.scenes.at(-1)?.ending)
  const [selected, setSelected] = useState<number | 'cover'>(data.scenes.length ? 0 : 'cover')
  const [query, setQuery] = useState('')
  const [jump, setJump] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(data.revision)
  const draft = { scenes, cover, ending, hasEnding }
  const [saved, setSaved] = useState(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const addInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const isCover = selected === 'cover'
  const image = isCover ? cover : scenes[selected]
  const visible = scenes.map((scene, index) => ({ scene, index })).filter(({ scene, index }) =>
    `${index + 1} ${scene.label ?? ''} ${scene.labelEn ?? ''} ${scene.caption ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()))
  const withEnding = () => scenes.map((scene, index) => index === scenes.length - 1 && hasEnding ? { ...scene, ending } : scene)

  useEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest?.('a')
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey || anchor.href === location.href) return
      if (!confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', leave)
    document.addEventListener('click', navigate, true)
    return () => { window.removeEventListener('beforeunload', leave); document.removeEventListener('click', navigate, true) }
  }, [dirty])

  const patch = (value: Partial<FactionTeamImage>) => {
    setMessage('')
    if (isCover) setCover(current => current ? { ...current, ...value } : current)
    else setScenes(current => current.map((scene, index) => index === selected ? { ...scene, ...value } : scene))
  }

  const downloadDraft = () => {
    const payload = { id: data.id, revision, scenes: withEnding(), cover }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.target = '_blank'
    anchor.download = `scene-current-${data.slug || data.id}-${Date.now()}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const save = async () => {
    const images = withEnding()
    const invalid = validateSceneDraft(images, cover, data.isMyth)
    if (invalid) return setError(invalid)
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await saveSceneArtwork({ id: data.id, revision, scenes: images, cover })
      if (!result.success) throw new Error(result.error)
      setRevision(result.revision); setSaved(draft); setMessage(result.warning || '저장했습니다. 제목과 해설을 갖춘 장면이 해당 언어 화면에 노출됩니다.')
      router.refresh()
    } catch (error) { setError(error instanceof Error && error.message ? error.message : '저장하지 못했습니다. 편집본을 백업한 뒤 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  const upload = async (files: FileList | null, replace: boolean) => {
    if (!files?.length || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      for (const [index, file] of Array.from(files).entries()) {
        if (file.size > SCENE_UPLOAD_MAX_BYTES) throw new Error(`${file.name}: 9 MB 이하 파일을 사용해 주세요.`)
        const form = new FormData()
        form.set('id', data.id); form.set('role', replace && isCover ? 'cover' : 'scene'); form.set('file', file)
        const result = await uploadSceneArtwork(form)
        if (!result.success || !result.url) throw new Error(result.error ?? '업로드하지 못했습니다.')
        const url = result.url
        if (replace && isCover) setCover(current => ({ ...(current ?? { label: data.name }), url }))
        else if (replace) setScenes(current => current.map((scene, i) => i === selected ? { ...scene, url } : scene))
        else { setScenes(current => [...current, { url, kind: 'scene' }]); setSelected(scenes.length + index); setQuery('') }
        if (replace) break
      }
      setMessage('이미지를 준비했습니다. 설명을 확인한 뒤 저장해 주세요.')
    } catch (error) { setError(error instanceof Error ? error.message : '이미지를 올리지 못했습니다.') }
    finally { setBusy(false); if (addInput.current) addInput.current.value = ''; if (replaceInput.current) replaceInput.current.value = '' }
  }

  const move = (destination: number) => {
    if (typeof selected !== 'number' || destination < 0 || destination >= scenes.length || destination === selected) return
    const next = [...scenes]; const [target] = next.splice(selected, 1); next.splice(destination, 0, target)
    setScenes(next); setSelected(destination); setQuery(''); setMessage('')
  }
  const remove = () => {
    if (!confirm(`${isCover ? '시작 이미지' : `${Number(selected) + 1}번 장면`}를 목록에서 제외할까요? 저장하면 반영됩니다.`)) return
    if (isCover) setCover(null)
    else {
      const next = scenes.filter((_, index) => index !== selected)
      setScenes(next); setSelected(next.length ? Math.min(Number(selected), next.length - 1) : 'cover')
      if (!next.length) setHasEnding(false)
    }
    setMessage('')
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-bg-card" aria-label={`${data.name} 장면 편집`}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-bg-card p-4">
        <div><h2 className="text-lg font-bold text-text-primary">{data.name}</h2><p className="mt-1 text-xs text-text-tertiary">주요 장면 {scenes.length}장 · KO {toSceneImages(scenes, 'ko').length} · EN {toSceneImages(scenes, 'en').length}{dirty && <span className="ml-2 text-amber-500">저장 전 변경</span>}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={data.isMyth ? `/myths?myth=${data.id}` : `/factions/${data.id}`} className={SCENE_BUTTON}>기본 정보</Link>
          {data.slug && <a href={`${(process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')}/explore/${data.isMyth ? 'myth?myth=' : 'faction/'}${data.slug}`} target="_blank" rel="noreferrer" className={SCENE_BUTTON}><ExternalLink size={14} />서비스 보기</a>}
          <button type="button" onClick={downloadDraft} className={SCENE_BUTTON}><Download size={14} />편집본 백업</button>
          <button type="button" onClick={() => { if (confirm('저장 전 변경을 되돌릴까요?')) { setScenes(saved.scenes); setCover(saved.cover); setEnding(saved.ending); setHasEnding(saved.hasEnding); setSelected(saved.scenes.length ? 0 : 'cover'); setMessage(''); setError('') } }} disabled={!dirty || busy} className={SCENE_BUTTON}>되돌리기</button>
          <button type="button" onClick={save} disabled={!dirty || busy} className={`${SCENE_BUTTON} border-accent/50 bg-accent/10 text-accent`}><Save size={15} />{busy ? '처리 중…' : '저장'}</button>
        </div>
      </div>
      {error && <p role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="border-b border-border px-4 py-3 text-sm text-text-secondary">{message}</p>}
      <input ref={addInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple hidden onChange={e => void upload(e.target.files, false)} />
      <input ref={replaceInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={e => void upload(e.target.files, true)} />
      <fieldset disabled={busy} className="grid min-w-0 items-start lg:grid-cols-[190px_minmax(0,1fr)]">
        <legend className="sr-only">장면 목록과 내용</legend>
        <div className="space-y-3 border-b border-border p-3 lg:sticky lg:top-24 lg:border-b-0 lg:border-r">
          <button type="button" onClick={() => setSelected('cover')} aria-pressed={isCover} className={`${SCENE_BUTTON} w-full ${isCover ? 'border-accent bg-accent/10 text-accent' : ''}`}>시작 이미지{!cover && ' · 없음'}</button>
          <input aria-label="장면 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="장면 번호·제목 검색" className={SCENE_INPUT} />
          <div className="flex gap-1"><input aria-label="이동할 장면 번호" type="number" min={1} max={scenes.length || 1} value={jump} onChange={e => setJump(e.target.value)} className={SCENE_INPUT} placeholder="번호" /><button type="button" className={SCENE_BUTTON} disabled={!Number.isInteger(Number(jump)) || Number(jump) < 1 || Number(jump) > scenes.length} onClick={() => { setSelected(Number(jump) - 1); setQuery('') }}>이동</button></div>
          <nav aria-label="장면 순서" className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[calc(100vh-400px)]">
            {visible.map(({ scene, index }) => <button type="button" key={`${index}-${scene.url}`} onClick={() => setSelected(index)} aria-current={selected === index ? 'true' : undefined}
              className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected === index ? 'border-accent/60 bg-accent/10' : 'border-transparent hover:border-border hover:bg-bg-secondary'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scene.url} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded object-cover" />
              <span className="min-w-0"><span className="block text-[10px] tabular-nums text-text-tertiary">{String(index + 1).padStart(2, '0')}{(!scene.labelEn?.trim() || !scene.captionEn?.trim()) && ' · EN 없음'}</span><span className="line-clamp-2 text-xs text-text-primary">{scene.label || '제목 없음'}</span></span>
            </button>)}
            {!visible.length && <p className="py-5 text-center text-xs text-text-tertiary">{scenes.length ? '검색 결과가 없습니다.' : '아직 장면이 없습니다.'}</p>}
          </nav>
          <button type="button" onClick={() => addInput.current?.click()} className={`${SCENE_BUTTON} w-full`}><ImagePlus size={16} />장면 추가</button>
        </div>
        <div className="min-w-0 space-y-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{isCover ? '시작 이미지' : `${selected + 1} / ${scenes.length}`}</h3>
            <div className="flex flex-wrap gap-1.5">
              {!isCover && <><button type="button" aria-label="장면 앞으로" onClick={() => move(selected - 1)} disabled={selected === 0} className={SCENE_BUTTON}><ArrowUp size={14} /></button><button type="button" aria-label="장면 뒤로" onClick={() => move(selected + 1)} disabled={selected === scenes.length - 1} className={SCENE_BUTTON}><ArrowDown size={14} /></button><select aria-label="장면 순서 변경" value={selected} onChange={e => move(Number(e.target.value))} className={`${SCENE_INPUT} !w-auto`}>{scenes.map((_, index) => <option key={index} value={index}>{index + 1}번으로</option>)}</select></>}
              <button type="button" onClick={() => replaceInput.current?.click()} className={SCENE_BUTTON}><Upload size={14} />{image ? '이미지 교체' : '이미지 등록'}</button>
              {image && <button type="button" onClick={remove} aria-label="이미지 목록에서 제외" className={`${SCENE_BUTTON} hover:!border-red-400 hover:!text-red-400`}><Trash2 size={14} /></button>}
            </div>
          </div>
          {image ? <>
            <a href={image.url} target="_blank" rel="noreferrer" aria-label="이미지 원본 열기" className="block overflow-hidden rounded-lg border border-border bg-black/40 hover:border-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.label || data.name} className="max-h-[360px] w-full object-contain" />
            </a>
            <p className="text-xs leading-5 text-text-tertiary">{isCover ? '이야기의 첫인상을 보여주는 그림입니다. 반전이나 해결 방법이 드러나는 소품은 피합니다.' : '1:1 이미지를 권장합니다. 다른 비율도 원본 그대로 등록하며, 제목과 해설이 비어 있는 언어에서는 노출되지 않습니다.'}</p>
            <SceneTextFields image={image} patch={patch} members={data.members} />
          </> : <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center"><ImagePlus size={28} className="mb-3 text-text-tertiary" /><p className="text-sm text-text-secondary">{isCover ? '시작 그림을 등록해 주세요.' : '장면 이미지를 추가해 주세요.'}</p></div>}
        </div>
      </fieldset>
      <fieldset disabled={busy || !scenes.length} className="space-y-4 border-t border-border p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-text-primary hover:text-accent"><input type="checkbox" checked={hasEnding} onChange={e => setHasEnding(e.target.checked)} className="accent-amber-500" />마지막 장면 뒤에 엔딩 카드 표시</label>
        {hasEnding && <><p className="text-xs text-text-tertiary">순서를 바꿔도 엔딩은 항상 마지막 장면 뒤에 붙습니다.</p><SceneEndingFields ending={ending} onChange={setEnding} /></>}
      </fieldset>
    </section>
  )
}
