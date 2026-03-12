import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, interpolate } from 'remotion'

type Props = {
  images: string[]
}

export const ImageSlideshow: React.FC<Props> = ({ images }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const framesPerSlide = Math.floor(durationInFrames / images.length)
  const currentIndex = Math.min(Math.floor(frame / framesPerSlide), images.length - 1)
  const localFrame = frame - currentIndex * framesPerSlide

  // Ken Burns effect: slow zoom
  const scale = interpolate(localFrame, [0, framesPerSlide], [1, 1.08], { extrapolateRight: 'clamp' })

  // Fade transition
  const opacity = interpolate(localFrame, [0, 15, framesPerSlide - 15, framesPerSlide], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        <Img
          src={images[currentIndex]}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
