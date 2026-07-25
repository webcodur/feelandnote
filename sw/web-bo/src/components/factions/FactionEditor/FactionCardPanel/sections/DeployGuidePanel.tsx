import { useState } from 'react'
import { DEPLOY_GUIDE, PLATFORM_INFO, PlatformId } from '../utils'

export function DeployGuidePanel() {
  const [platformInfo, setPlatformInfo] = useState<PlatformId | null>(null)

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border/60 bg-bg-card/30 px-3 py-2 text-[11px] leading-relaxed text-text-dim">
        <span className="font-semibold text-text-secondary">배포 가이드</span>
        {DEPLOY_GUIDE.map(row => (
          <span key={row.ratio} className="flex items-center gap-1.5">
            <b className="text-text-secondary">{row.ratio}</b>
            {row.targets.map(t => (
              <button
                key={t}
                onClick={() => setPlatformInfo(t)}
                className="rounded-full border border-border bg-bg-card px-2 py-0.5 text-[11px] text-text-secondary hover:border-accent hover:text-accent"
                title={`${PLATFORM_INFO[t].name} 상세 안내`}
              >
                {PLATFORM_INFO[t].name}
              </button>
            ))}
          </span>
        ))}
        <span className="basis-full text-[11px]">
          <b className="text-accent">추천 순서</b> — ① 스토리 컨셉샷 3장 생성해 튜링 팩 완성 → ② 인스타+쓰레드 계정 개설 후 3:4 캐러셀 9장 첫 게시(같은 묶음 양쪽에) → ③ 같은 날 X에 단독 대사 카드 1장+본문 텍스트 → ④ 반응 보고 9:16으로 틱톡 실험
        </span>
        <span className="basis-full text-[11px]">
          <b className="text-accent">게시 리듬</b> — 인물 팩은 2~3일에 1개(요일·시간 고정, 예: 화·목·토 저녁 8시). 하루 2개 이상은 도달 나눠먹기라 금물. X 명언 텍스트만 매일 1 창 2개 고빈도 가능. 인물 14명 ≈ 5~6주 시즌
        </span>
        <span className="basis-full text-[11px]">
          <b className="text-accent">지금 만들기로 한 것 — 인스타 2계정 체제(한국 명의)</b> — ① <b className="text-text-secondary">한국어 본진</b>: 도감 브랜드. 팩 캐러셀 중심 + 단독 대사 카드 병행, 안내 장 유지(사이트·유튜브 깔때기) ② <b className="text-text-secondary">일본어 물량</b>: 보너스 수익 전용. 단일 대사 카드 양산(월 150개 한도 활용), 안내 장 제외(일문 목적지 없음), 이미지는 한국어판과 공유하되 텍스트만 일문 렌더 — 카드 대본 언어판(cards.ja.json) 추가 필요. 영어 계정은 보류(미국이 보너스 지원국이라 현지 경쟁 극심, 영어는 X 레인에서)
        </span>
      </div>
      {/* 서비스 상세 안내 모달 */}
      {platformInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={() => setPlatformInfo(null)}>
          <div className="w-[520px] max-w-full rounded-lg border border-border bg-bg-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-base font-bold text-text-primary">{PLATFORM_INFO[platformInfo].name}</span>
              <span className="text-xs text-text-dim">{PLATFORM_INFO[platformInfo].company}</span>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
              {PLATFORM_INFO[platformInfo].lines.map((line, i) => (
                <li key={i} className="flex gap-2"><span className="text-accent">·</span><span>{line}</span></li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setPlatformInfo(null)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
