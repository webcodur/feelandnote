/*
  파일명: /app/reading/components/SectionWindow/compressImage.ts
  기능: 이미지 압축 유틸
  책임: 붙여넣은 이미지를 크기 제한에 맞게 압축한다.
*/ // ------------------------------

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB 제한

// 이미지 압축 함수
export function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // 최대 너비 제한
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context 생성 실패"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 품질을 낮춰가며 크기 제한 맞추기
        let currentQuality = quality;
        let result = canvas.toDataURL("image/jpeg", currentQuality);

        while (result.length > MAX_IMAGE_SIZE && currentQuality > 0.1) {
          currentQuality -= 0.1;
          result = canvas.toDataURL("image/jpeg", currentQuality);
        }

        if (result.length > MAX_IMAGE_SIZE) {
          reject(new Error("이미지가 너무 큽니다. 더 작은 이미지를 사용해주세요."));
          return;
        }

        resolve(result);
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
