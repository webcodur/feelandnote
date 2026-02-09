"use server";

import * as cheerio from "cheerio";

interface FetchUrlResult {
  title?: string;
  content?: string; // HTML content
  text?: string;    // Plain text for summary/preview
  error?: string;
}

export async function fetchUrlContent(url: string): Promise<FetchUrlResult> {
  try {
    // 1. Fetch HTML
    // 네이버 블로그 등 일부 사이트는 User-Agent 확인을 함.
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    let response = await fetch(url, { headers });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    // 2. Buffer로 받아와서 디코딩 처리 (EUC-KR 대응 등을 위해 text() 바로 호출 지양)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // charset 감지 로직이 복잡하므로, 일단 UTF-8 시도 후 실패 시 EUC-KR(CP949) 가정 
    // (네이버 블로그 일부 구형 스킨이 EUC-KR일 수 있음. 하지만 최근엔 대부분 UTF-8)
    let html = buffer.toString("utf-8");
    
    // meta tag로 charset 확인 (간단한 정규식)
    const charsetMatch = html.match(/<meta[^>]*charset=["']?([\w-]+)/i);
    if (charsetMatch && charsetMatch[1].toUpperCase().includes("KR")) {
        // EUC-KR 감지 시 재디코딩 (Node.js TextDecoder 사용)
        const decoder = new TextDecoder("euc-kr");
        html = decoder.decode(arrayBuffer);
    }

    // 3. 네이버 블로그 iframe 처리
    // 네이버 블로그는 메인 페이지가 iframe을 포함하고 본문은 다른 주소에 있음.
    // blog.naver.com/{id}/{logNo} 형태 또는 iframe#mainFrame
    if (url.includes("blog.naver.com")) {
        const $ = cheerio.load(html);
        const iframeSrc = $("#mainFrame").attr("src");
        if (iframeSrc) {
            const realUrl = `https://blog.naver.com${iframeSrc}`;
            const subResponse = await fetch(realUrl, { headers });
            if (subResponse.ok) {
                 const subBuffer = await subResponse.arrayBuffer();
                 // 여기도 디코딩 필요할 수 있음
                 const subDecoder = new TextDecoder("utf-8"); // 보통 내부 프레임도 utf-8이나 확인 필요
                 html = subDecoder.decode(subBuffer);
            }
        }
    }

    // 4. Parse content with Cheerio
    const $ = cheerio.load(html);

    // 제목 추출
    // og:title 우선, 없으면 title 태그
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim();

    // 본문 추출
    // 사이트별로 selector가 다름. 일반적인 article, main 태그나 네이버 블로그 전용 selector 시도
    let $content;
    
    // 네이버 블로그 (스마트 에디터)
    if (url.includes("blog.naver.com")) {
        // se-main-container: 스마트에디터 ONE
        // postViewArea: 구형 에디터
        $content = $(".se-main-container");
        if ($content.length === 0) {
            $content = $("#postViewArea");
        }
    }

    // 일반 사이트 Fallback
    if (!$content || $content.length === 0) {
        $content = $("article, main, .content, #content, .post-body");
    }
    
    // 그래도 없으면 body 전체에서 script, style 제거 후 사용 (너무 지저분할 수 있음)
    if (!$content || $content.length === 0) {
        $content = $("body");
    }

    // 불필요한 태그 제거 (clean-up)
    $content.find("script, style, iframe, nav, footer, header, .ad, .advertisement, button, form, input").remove();
    
    // 스타일 및 클래스 제거 (App 내 스타일 적용을 위해)
    $content.find("*").removeAttr("style").removeAttr("class").removeAttr("width").removeAttr("height").removeAttr("align").removeAttr("face").removeAttr("color");

    // 이미지 경로 처리 및 정리
    $content.find("img").each((_, el) => {
        const $el = $(el);
        const src = $el.attr("src") || $el.attr("data-src");
        // Lazy loading 등으로 src가 없는 경우 처리
        if (src) {
            $el.attr("src", src);
            // 불필요한 속성 제거
            $el.removeAttr("data-src").removeAttr("loading").removeAttr("srcset");
        } else {
            $el.remove();
        }
    });

    // 링크 처리 (새 창으로 열기)
    $content.find("a").attr("target", "_blank").attr("rel", "noopener noreferrer");

    // 빈 태그 제거 (이미지 없는 p 태그 등)
    $content.find("p, div, span").each((_, el) => {
        if ($(el).text().trim() === "" && $(el).find("img").length === 0) {
            $(el).remove();
        }
    });

    // HTML 반환
    const cleanHtml = $content.html() || "";
    const text = $content.text().replace(/\s+/g, " ").trim().substring(0, 200); // 200자 요약

    return {
      title,
      content: cleanHtml,
      text,
    };
  } catch (error: any) {
    console.error("fetchUrlContent error:", error);
    return { error: error.message };
  }
}
