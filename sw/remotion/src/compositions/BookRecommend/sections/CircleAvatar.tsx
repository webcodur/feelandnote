import { Img } from 'remotion'
import { DARK } from '../../theme'
import { freshAvatarUrl } from '../../../lib/avatar'

type Props = {
  avatarUrl: string
  size: number
  filter?: string
}

/**
 * 원형 아바타 — 외부 그림자 ring + 골드 테두리 + 이미지.
 * 쇼츠 내 여러 곳(오프닝, 스트립, 인트로)에서 공용.
 */
export const CircleAvatar: React.FC<Props> = ({
  avatarUrl,
  size,
  filter = 'brightness(0.9) contrast(1.05)',
}) => (
  <div style={{ position: 'relative' }}>
    <div style={{
      position: 'absolute', inset: -6,
      borderRadius: '50%',
      background: DARK.surface,
      boxShadow: `0 0 20px 10px ${DARK.surface}`,
    }} />
    <div style={{
      position: 'relative',
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      border: '3px solid rgba(200,164,110,0.25)',
      boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
    }}>
      <Img src={freshAvatarUrl(avatarUrl)} style={{
        width: '100%', height: '100%', objectFit: 'cover', filter,
      }} />
    </div>
  </div>
)
