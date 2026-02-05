import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";

// 싱글톤 인스턴스
let faceLandmarker: FaceLandmarker | null = null;

// 초기화 함수
export async function initFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;

  try {
    console.log("Initializing FaceLandmarker...");
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
    );
    console.log("FilesetResolver created");
    
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "CPU"
      },
      outputFaceBlendshapes: false,
      runningMode: "IMAGE",
      numFaces: 1
    });
    console.log("FaceLandmarker created");
    return faceLandmarker;
  } catch (error) {
    console.error("Failed to initialize FaceLandmarker:", error);
    throw error;
  }
}

// 랜드마크 감지 함수
// 이미지를 80%로 축소 + 여백 추가하여 턱 최하단 인식 정확도 개선
const DETECT_SCALE = 0.8;

export async function detectFaceLandmarks(image: HTMLImageElement): Promise<NormalizedLandmark[] | null> {
  if (!image.complete || image.naturalWidth === 0) return null;

  try {
    const landmarker = await initFaceLandmarker();

    // 캔버스에 축소 배치 (주변 여백 확보)
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!;

    const scaledW = canvas.width * DETECT_SCALE;
    const scaledH = canvas.height * DETECT_SCALE;
    const offsetX = (canvas.width - scaledW) / 2;
    const offsetY = (canvas.height - scaledH) / 2;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offsetX, offsetY, scaledW, scaledH);

    const result = landmarker.detect(canvas);

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      // 좌표를 원본 이미지 기준으로 역변환
      const margin = (1 - DETECT_SCALE) / 2;
      return result.faceLandmarks[0].map(lm => ({
        ...lm,
        x: (lm.x - margin) / DETECT_SCALE,
        y: (lm.y - margin) / DETECT_SCALE,
      }));
    }
    return null;
  } catch (e) {
    console.error("Error during detection:", e);
    throw e;
  }
}

export interface OptimalCropResult {
  zoom: number;
  center: { x: number; y: number }; // Normalized (0-1) target center on image
}

// 턱 최하단부 찾기: 하악 윤곽 랜드마크 중 y가 가장 큰 점 + 피부 보정
function findChinBottom(landmarks: NormalizedLandmark[], glabellaY: number) {
  const JAW_BOTTOM_INDICES = [152, 175, 199, 377, 148, 176, 400];
  let maxY = 0;
  let x = landmarks[152].x;

  for (const idx of JAW_BOTTOM_INDICES) {
    if (landmarks[idx].y > maxY) {
      maxY = landmarks[idx].y;
      x = landmarks[idx].x;
    }
  }

  // 피부 최하단 보정 (미간~턱 거리의 10%)
  const padding = (maxY - glabellaY) * 0.10;
  return { x, y: maxY + padding };
}

// 최적 크롭 계산 함수
export function calculateOptimalCrop(
  landmarks: NormalizedLandmark[]
): OptimalCropResult {
  const glabella = landmarks[168]; // 미간
  const chin = findChinBottom(landmarks, glabella.y); // 턱 최하단

  // 미간(1/3) ~ 턱끝(2/3) = 뷰포트 높이의 1/3
  // 한 단계(0.1) 축소하여 턱 최하단 여유 확보
  const faceHeight = chin.y - glabella.y;
  const z = 1 / (3 * faceHeight);
  const zoom = Math.min(5, Math.max(1, z - 0.1));

  // 뷰포트 상단 1/3에 미간이 오도록 중심점 계산
  const targetCenterY = glabella.y + (1 / 6) / zoom;
  const targetCenterX = (glabella.x + chin.x) / 2;

  return {
    zoom,
    center: { x: targetCenterX, y: targetCenterY },
  };
}
