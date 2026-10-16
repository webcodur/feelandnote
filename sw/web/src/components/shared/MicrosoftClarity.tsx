import Script from "next/script";

/** GA4와 함께 사용하는 행동 분석. 프로젝트 ID가 없는 환경에서는 수집하지 않는다. */
export default function MicrosoftClarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

  if (
    process.env.NODE_ENV !== "production" ||
    !projectId ||
    !/^[a-z0-9]+$/.test(projectId)
  ) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script",${JSON.stringify(projectId)});`}
    </Script>
  );
}
