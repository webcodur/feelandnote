import * as faceapi from 'face-api.js';

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  ]);
  modelsLoaded = true;
}

export interface FaceDetectionResult {
  landmarks: faceapi.FaceLandmarks68;
  box: { x: number; y: number; width: number; height: number };
}

export async function detectFaceLandmarks(
  image: HTMLImageElement
): Promise<FaceDetectionResult | null> {
  if (!image.complete || image.naturalWidth === 0) return null;

  try {
    await loadModels();
    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    if (!detection) return null;
    const { x, y, width, height } = detection.detection.box;
    return { landmarks: detection.landmarks, box: { x, y, width, height } };
  } catch (e) {
    console.error('Face detection error:', e);
    throw e;
  }
}

// 얼굴이 1:1 프레임에서 차지할 비율
const FACE_FRAME_RATIO = 0.55;

/**
 * 원본 이미지 픽셀 좌표로 최적 크롭 영역을 반환한다.
 * react-easy-crop의 initialCroppedAreaPixels에 직접 사용 가능.
 */
export function calculateFaceCropArea(
  result: FaceDetectionResult,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const { landmarks, box } = result;

  // landmark 27 (콧대 상단) = 양눈 사이 정중앙, 모든 얼굴에서 일관된 기준점
  const nose = landmarks.getNose();
  const noseBridgeTop = nose[0]; // landmark 27

  const faceCenterX = noseBridgeTop.x;
  const faceCenterY = noseBridgeTop.y;

  // 1:1 크롭 영역 크기: 바운딩 박스의 큰 축 / FACE_FRAME_RATIO
  const faceSize = Math.max(box.width, box.height);
  const cropSize = faceSize / FACE_FRAME_RATIO;

  // 이미지 경계를 넘지 않도록 클램프
  const clampedSize = Math.min(cropSize, imageWidth, imageHeight);
  const halfSize = clampedSize / 2;

  const cx = Math.max(halfSize, Math.min(imageWidth - halfSize, faceCenterX));
  const cy = Math.max(halfSize, Math.min(imageHeight - halfSize, faceCenterY));

  return {
    x: cx - halfSize,
    y: cy - halfSize,
    width: clampedSize,
    height: clampedSize,
  };
}
