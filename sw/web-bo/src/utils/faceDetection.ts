import * as faceapi from 'face-api.js';

import {
  computeCropFromBox,
  computeCropFromLandmarks,
  type CropResult,
  type FaceAnchors,
} from '@/lib/avatar-geometry';

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

/**
 * 랜드마크에서 눈 평균 좌표와 턱끝을 뽑는다.
 * 눈은 좌우 눈 점 전체의 평균, 턱끝은 턱선 배열의 가운데 점(landmark 8)이다.
 * scripts/measure-avatar-geometry.ts의 실측 코드와 같은 방식이다.
 */
function extractAnchors(landmarks: faceapi.FaceLandmarks68): FaceAnchors | null {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const jaw = landmarks.getJawOutline();
  if (!leftEye.length || !rightEye.length || !jaw.length) return null;

  const eyePoints = [...leftEye, ...rightEye];
  const eyeX = eyePoints.reduce((sum, p) => sum + p.x, 0) / eyePoints.length;
  const eyeY = eyePoints.reduce((sum, p) => sum + p.y, 0) / eyePoints.length;
  const chin = jaw[Math.floor(jaw.length / 2)];

  // 턱이 눈보다 위면 랜드마크가 어긋난 것 — 상자 폴백으로 넘긴다
  if (!(chin.y > eyeY)) return null;

  return { eyeX, eyeY, chinY: chin.y };
}

export interface FaceCropSuggestion {
  /** react-easy-crop의 initialCroppedAreaPixels에 그대로 넣는 원본 픽셀 좌표 */
  area: { x: number; y: number; width: number; height: number };
  /** 비어 있지 않으면 결과가 규격을 벗어난다. 호출부는 반드시 사용자에게 보여준다. */
  warnings: string[];
  basis: CropResult['basis'];
}

/**
 * 규격대로 자를 정사각 영역을 구한다.
 * 계산은 lib/avatar-geometry.ts 한 곳에서만 한다 — 서버 스크립트와 같은 구현이다.
 */
export function calculateFaceCropArea(
  result: FaceDetectionResult,
  imageWidth: number,
  imageHeight: number
): FaceCropSuggestion {
  const anchors = extractAnchors(result.landmarks);
  const crop = anchors
    ? computeCropFromLandmarks(anchors, imageWidth, imageHeight)
    : computeCropFromBox(result.box, imageWidth, imageHeight);

  return {
    area: { x: crop.left, y: crop.top, width: crop.size, height: crop.size },
    warnings: crop.warnings,
    basis: crop.basis,
  };
}
