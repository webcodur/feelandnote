import React from 'react';
import { interpolate, Img } from 'remotion';
import { sf, safeImg } from '../utils';
import { freshAvatarUrl } from '../../../lib/avatar';
import { DARK } from '../../theme';

// 백업: BookRecommendShort.tsx 안에서 사용되던 구 버전 오프닝 리빌 (아바타 + 책 포스터 교차 뷰)
// 복원 출처: git unreachable blob 3574492800cd7d5af9a9cbed0369242f3386a8a1
// 사용처 없음. 인트로 디자인을 구버전(무대/원형 인물 + 회전 책 표지)으로 되돌릴 때 참조용.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OldShortsIntroBackup = ({ frame, revealOp, HEADER_H, W, MID_H, REVEAL_BG, book, host }: any) => {
  const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }
  const beat1Scale = interpolate(frame, [0, 60 * 0.8], [1.06, 1], CL)
  return (
    <div style={{
      position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
      zIndex: 8, opacity: revealOp, overflow: 'hidden',
    }}>
      <Img src={sf(REVEAL_BG)} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: 'brightness(0.35) saturate(0.5)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(6,4,2,0.7) 100%)',
      }} />
      {/* 책 포스터 */}
      <div style={{
        position: 'absolute',
        top: '50%', left: 420,
        transform: `translateY(-50%) rotate(-3deg) scale(${beat1Scale})`,
        zIndex: 1,
      }}>
        <div style={{
          width: 380, height: 570, borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,164,110,0.15)',
        }}>
          <Img src={safeImg(book.thumbnail_url)} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
        </div>
      </div>
      {/* 아바타 — 원형 */}
      <div style={{
        position: 'absolute',
        top: '50%', left: 140,
        transform: `translateY(-38%) scale(${beat1Scale})`,
        zIndex: 2,
      }}>
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          background: DARK.surface,
          boxShadow: `0 0 20px 10px ${DARK.surface}`,
        }} />
        <div style={{
          position: 'relative',
          width: 380, height: 380,
          overflow: 'hidden',
          borderRadius: '50%',
          boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
          border: '3px solid rgba(200,164,110,0.25)',
        }}>
          <Img src={freshAvatarUrl(host.avatar_url)} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.9) contrast(1.05)',
          }} />
        </div>
      </div>
    </div>
  )
}
