/** 관리자 아바타 자동 맞춤. 누끼는 CLI와 같은 reframe, 일반 사진은 nobg 전 여유 크롭. */
import { computePreparationCrop, type CropResult, type SilhouetteInfo } from '@/lib/avatar-geometry'
import { computeReframeCrop, reframeAnchorsOf, silhouetteFromRgba } from '@/lib/avatar-reframe'

type FaceApi = typeof import('@vladmandic/face-api');
type FaceLandmarks68 = import('@vladmandic/face-api').FaceLandmarks68;

/** public/models 에 둔 weights. manifest가 `.bin`을 가리킨다 */
const MODEL_URI = '/models';

/**
 * 라이브러리와 weights를 처음 쓸 때 한 번만 가져온다.
 *
 * 브라우저 빌드가 tfjs를 안고 있어 1.3MB다. 정적 import로 두면 이 창을 쓰는 모든 화면의
 * 초기 번들에 들어가므로 실행 시점까지 미룬다.
 *
 * boolean 플래그가 아니라 Promise를 캐시한다 — 자동 맞춤이 연달아 불릴 때 weights를 두 번 받지 않는다.
 * 실패하면 캐시를 비워 다음 시도가 다시 받게 한다.
 */
let loading: Promise<FaceApi> | null = null;

function loadFaceApi(): Promise<FaceApi> {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
      ]);
      return faceapi;
    })().catch((e: unknown) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export interface FaceDetectionResult {
  landmarks: FaceLandmarks68;
  box: { x: number; y: number; width: number; height: number };
}

export async function detectFaceLandmarks(
  image: HTMLImageElement
): Promise<FaceDetectionResult | null> {
  if (!image.complete || image.naturalWidth === 0) return null;

  const faceapi = await loadFaceApi();
  // 투명 영역을 CLI와 같은 중간 회색으로 깔아 얼굴을 검출한다.
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  const detections = await faceapi
    .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();
  if (detections.length > 1) throw new Error('여러 얼굴이 검출됐습니다. 한 인물의 사진을 넣거나 직접 맞춰 주세요.');
  const detection = detections[0];
  if (!detection) return null;

  const { x, y, width, height } = detection.detection.box;
  return { landmarks: detection.landmarks, box: { x, y, width, height } };
}

/** 원본 알파를 그대로 읽는다. 얼굴 검출용 회색 합성본을 사용하면 안 된다. */
export function readAvatarSilhouette(image: HTMLImageElement): SilhouetteInfo | null {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return silhouetteFromRgba(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}

export interface FaceCropSuggestion {
  /** react-easy-crop의 initialCroppedAreaPixels에 그대로 넣는 원본 픽셀 좌표 */
  area: { x: number; y: number; width: number; height: number };
  /** 비어 있지 않으면 결과가 규격을 벗어난다. 호출부는 반드시 사용자에게 보여준다. */
  warnings: string[];
  basis: CropResult['basis'];
  mode: 'reframe' | 'preparation';
}

/** 최종 구도는 reframe 규격, 배경 사진은 nobg 비용을 줄이는 여유 크롭이다. */
export function calculateFaceCropArea(
  result: FaceDetectionResult,
  imageWidth: number,
  imageHeight: number,
  silhouette: SilhouetteInfo | null,
): FaceCropSuggestion {
  const anchors = reframeAnchorsOf(result.landmarks);
  if (!anchors) throw new Error('눈·턱 기준점을 읽지 못했습니다. 직접 맞춰 주세요.');
  const crop = silhouette
    ? computeReframeCrop(anchors, silhouette, imageWidth, imageHeight)
    : computePreparationCrop(anchors, imageWidth, imageHeight);
  return {
    area: { x: crop.left, y: crop.top, width: crop.size, height: crop.size },
    warnings: crop.warnings,
    basis: crop.basis,
    mode: silhouette ? 'reframe' : 'preparation',
  };
}
