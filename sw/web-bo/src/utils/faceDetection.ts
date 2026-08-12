/**
 * 관리자 화면의 얼굴 검출 — 자동 크롭 제안의 기준점(눈·턱)을 뽑는다.
 *
 * 라이브러리는 `@vladmandic/face-api` 하나다. 노드 스크립트(scripts/crop-faces.ts 등)도 같은 것을 쓴다.
 * 폐기된 `face-api.js@0.22.2`를 되살리지 마라 — 2020년에 멈춘 배포판이고 tfjs 1.7.0을 따로 끌고 온다.
 * 두 벌이 공존하던 시절에도 weights는 바이트 단위로 같았고 파일명 규약(`-shard1` vs `.bin`)만 달랐다.
 *
 * 검출 모델은 서버와 다르다(화면 TinyFaceDetector / 서버 SSD MobileNet v1). 규격 좌표는 눈·턱을
 * 랜드마크로 직접 재므로 모델이 달라도 같은 결과가 나온다 — celeb-avatar-spec.md §6.
 *
 * 좌표 계산은 하지 않는다. lib/avatar-geometry.ts 한 곳이 담당한다.
 */
import {
  computeCropFromBox,
  computeCropFromLandmarks,
  judgeGeometry,
  type CropResult,
  type FaceAnchors,
} from '@/lib/avatar-geometry';

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
  const detection = await faceapi
    .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();
  if (!detection) return null;

  const { x, y, width, height } = detection.detection.box;
  return { landmarks: detection.landmarks, box: { x, y, width, height } };
}

/**
 * 랜드마크에서 눈 평균 좌표와 턱끝을 뽑는다.
 * 눈은 좌우 눈 점 전체의 평균, 턱끝은 턱선 배열의 가운데 점(landmark 8)이다.
 * scripts/measure-avatar-geometry.ts의 실측 코드와 같은 방식이다.
 */
function extractAnchors(landmarks: FaceLandmarks68): FaceAnchors | null {
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

  // 규격 판정까지 해서 넘긴다 — 노드 스크립트(crop-faces.ts)와 같은 검사다.
  const warnings = [...crop.warnings];
  if (anchors) {
    const verdict = judgeGeometry(anchors, crop);
    if (!verdict.pass) warnings.push(`규격 이탈: ${verdict.faults.join(' / ')}`);
  }

  return {
    area: { x: crop.left, y: crop.top, width: crop.size, height: crop.size },
    warnings,
    basis: crop.basis,
  };
}
