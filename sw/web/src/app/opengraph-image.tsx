import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const alt = 'Feelandnote'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default async function Image() {
  // Font loading
  let fontData: ArrayBuffer | null = null;
  try {
    const res = await fetch(
      new URL('https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf', import.meta.url)
    );
    if (res.ok) {
      fontData = await res.arrayBuffer();
    } else {
      console.error('Failed to fetch font:', res.status, res.statusText);
    }
  } catch (error) {
    console.error('Font loading error:', error);
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Cormorant Garamond", serif',
          position: 'relative',
        }}
      >
        {/* Background Gradient */}
        <div 
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, #121212 0%, #050505 100%)', // Deep Stone Dark
                zIndex: 0,
            }}
        />

        {/* Noise Texture Pattern (Optional simulation with CSS radial/conic if possible, simplified here) */}
        
        {/* Decorative Border (Double Line) */}
        <div
            style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                right: '40px',
                bottom: '40px',
                border: '1px solid rgba(138, 115, 42, 0.3)', // Dim Gold
                zIndex: 1,
            }}
        />
        <div
            style={{
                position: 'absolute',
                top: '48px',
                left: '48px',
                right: '48px',
                bottom: '48px',
                border: '1px solid rgba(138, 115, 42, 0.1)',
                zIndex: 1,
            }}
        />

        {/* Content */}
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
            }}
        >
            {/* Logo Text: FEEL & NOTE */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 96,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                }}
            >
                <span style={{ color: '#f8f4ed' }}>FEEL</span> {/* Cream Hero */}
                <span style={{ color: '#d4a828', margin: '0 24px', fontFamily: '"Cormorant Garamond"' }}>&</span> {/* Sepia Hero */}
                <span style={{ color: '#f8f4ed' }}>NOTE</span> {/* Cream Hero */}
            </div>

            {/* Subtitle */}
            <div
                style={{
                    marginTop: 24,
                    fontSize: 24,
                    color: '#a0a0a0', // Text Secondary
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontFamily: '"Cormorant Garamond", serif',
                }}
            >
                Cultural Archive
            </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [
        {
          name: 'Cormorant Garamond',
          data: fontData as ArrayBuffer,
          style: 'normal',
          weight: 600,
        },
      ] : undefined,
    }
  )
}
