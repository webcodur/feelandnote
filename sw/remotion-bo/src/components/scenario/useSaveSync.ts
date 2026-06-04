'use client'

import { useCallback } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { SaveScope } from '../../lib/episode-context'
import type { ImageField } from './types'
import { stripImagePrefix } from './utils'

export function useSaveSync(params: {
  episode: EpisodeData
  updateEpisode: (ep: EpisodeData) => void
  save: (data?: EpisodeData, opts?: { scope?: SaveScope }) => Promise<unknown>
  series: string
  name: string
  isEn: boolean
}) {
  const { episode, updateEpisode, save, series, name, isEn } = params

  // scope — 현재 보는 뷰가 정한다. 'shorts'는 쇼츠 파일만, 'longform'은 책 파일만 기록.
  const handleSave = useCallback(async (scope: SaveScope = 'all') => {
    const books = (episode.books ?? []) as any[]
    const errors: string[] = []
    let cleaned = false
    // 책 인용 검증·이미지 필드 자동지정은 책을 기록하는 scope 에서만 수행
    // (쇼츠 저장은 책 파일을 건드리지 않으므로 롱폼 인용 오류로 막히지 않는다)
    if (scope !== 'shorts') {
      books.forEach((b: any, i: number) => {
        for (const [pi, pair] of ((b.quotePairs ?? []) as any[]).entries()) {
          if (!pair.quote && pair.after) {
            errors.push(`책 ${i + 1} "${b.title}": 인용 ${pi + 1}에 직접 인용 없이 후속 맥락이 존재합니다.`)
          }
        }
        if (b.images?.length) {
          // quote 우선 판별 (quote/after 텍스트에 앵커 매칭) → 없으면 summary → context 순 폴백
          const quoteAfterText = ((b.quotePairs ?? []) as any[]).flatMap((p: any) => [p.quote ?? '', p.after ?? '']).join(' ')
          const fieldMap: [ImageField, string][] = [
            ['summary', b.summary ?? ''],
            ['quote', quoteAfterText],
            ['context', b.contextMain ?? ''],
          ]
          const allTexts = fieldMap.map(([, t]) => t).join(' ')
          b.images.forEach((img: any, j: number) => {
            if (!img.field && img.text) {
              for (const [f, t] of fieldMap) {
                if (t.includes(img.text)) { img.field = f; cleaned = true; break }
              }
            }
            if (j === 0 && !img.field) { img.field = 'summary'; cleaned = true }
            if (j > 0 && img.text && !allTexts.includes(img.text)) {
              delete img.text
              cleaned = true
            }
          })
        }
      })
    }
    if (errors.length) {
      alert('저장 불가:\n\n' + errors.join('\n'))
      return
    }

    // 쇼츠 이미지 경로 동기화: 롱폼 이미지 rename(prefix 부착/제거) 후 쇼츠 경로도 갱신
    // baseName → 현재 파일명 맵 구축 (롱폼 books.images + 디스크 폴더)
    const baseToFile = new Map<string, string>()
    for (const b of books) {
      for (const img of ((b as any).images ?? [])) {
        if (img.file) baseToFile.set(stripImagePrefix(img.file), img.file)
      }
    }
    const syncShortsImagePath = (imgPath: string): string => {
      const fn = imgPath.split('/').pop()
      if (!fn) return imgPath
      const base = stripImagePrefix(fn)
      const current = baseToFile.get(base)
      if (!current || current === fn) return imgPath
      return imgPath.slice(0, imgPath.length - fn.length) + current
    }

    // 쇼츠 중복 이미지 정리: 각 쇼츠 변형마다 앞 구간와 동일한 seg.image 제거
    const shortsArrLocal: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
    let cleanedShortsArr: any[] | undefined
    if (shortsArrLocal.length > 0) {
      const nextArr = shortsArrLocal.map((shorts: any) => {
        if (!shorts?.segments) return shorts
        const segs = [...shorts.segments]
        let lastImage: string | undefined
        let touched = false
        for (let si = 0; si < segs.length; si++) {
          const seg = segs[si]
          if (!seg.image) { lastImage = undefined; continue }
          // baseName 기반 경로 동기화 (롱폼 rename 반영)
          const synced = syncShortsImagePath(seg.image)
          if (synced !== seg.image) { seg.image = synced; touched = true }
          // imageChangeAt 경로도 동기화
          if (seg.imageChangeAt) {
            const changes = Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]
            for (const c of changes) {
              const cs = syncShortsImagePath(c.image)
              if (cs !== c.image) { c.image = cs; touched = true }
            }
          }
          const fn = seg.image.split('/').pop()
          if (fn === lastImage) {
            const copy = { ...seg }
            delete copy.image
            delete copy.imageChangeAt
            segs[si] = copy
            touched = true
          } else {
            const changes = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
            lastImage = changes.length > 0 ? changes[changes.length - 1].image?.split('/').pop() : fn
          }
        }
        if (touched) { cleaned = true; return { ...shorts, segments: segs } }
        return shorts
      })
      if (cleaned) cleanedShortsArr = nextArr
    }

    if (cleaned) {
      const updated: any = { ...episode, books }
      if (cleanedShortsArr) updated.shorts = cleanedShortsArr
      updateEpisode(updated as EpisodeData)
    }
    await save(undefined, { scope })
  }, [episode, save, updateEpisode])

  const syncImages = useCallback(async () => {
    const koName = isEn ? name.replace(/-en$/, '') : name
    const enName = isEn ? name : `${name}-en`
    try {
      const [resKo, resEn] = await Promise.all([
        fetch(`/api/${series}/episodes/${koName}`),
        fetch(`/api/${series}/episodes/${enName}`),
      ])
      if (!resKo.ok) throw new Error('ko 에피소드 로드 실패')
      if (!resEn.ok) throw new Error('en 에피소드 로드 실패')
      const ko = await resKo.json()
      const en = await resEn.json()

      const koBooks = ko.books ?? []
      const enBooks = [...(en.books ?? [])]
      let synced = 0
      koBooks.forEach((kb: any, i: number) => {
        if (i >= enBooks.length || !kb.images?.length) return
        enBooks[i] = {
          ...enBooks[i],
          images: kb.images.map((img: any) => ({ file: img.file, field: img.field, keyword: img.keyword, prompt: img.prompt })),
        }
        synced += kb.images.length
      })

      // shorts 배열 동기화: 각 인덱스마다 segments[].image 복사
      const koShortsArr: any[] = Array.isArray(ko.shorts) ? ko.shorts : (ko.shorts ? [ko.shorts] : [])
      const enShortsArr: any[] = Array.isArray(en.shorts) ? en.shorts : (en.shorts ? [en.shorts] : [])
      const mergedShortsArr = enShortsArr.map((enS: any, sIdx: number) => {
        const koS = koShortsArr[sIdx]
        if (!koS?.segments || !enS?.segments) return enS
        const ns = [...enS.segments]
        koS.segments.forEach((ks: any, i: number) => {
          if (i >= ns.length) return
          if (ks.image) { ns[i] = { ...ns[i], image: ks.image }; synced++ }
        })
        return { ...enS, segments: ns }
      })

      const updated: any = {
        ...en,
        books: enBooks,
        ...(enShortsArr.length > 0 ? { shorts: mergedShortsArr } : {}),
      }

      const saveRes = await fetch(`/api/${series}/episodes/${enName}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
      })
      if (!saveRes.ok) throw new Error('en 에피소드 저장 실패')
      alert(`${synced}장 동기화 완료 (${koName} → ${enName})`)
      if (isEn) window.location.reload()
    } catch (e: unknown) {
      alert('동기화 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [series, name, isEn])

  return { handleSave, syncImages }
}
