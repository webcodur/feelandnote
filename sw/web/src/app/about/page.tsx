import type { Metadata } from "next";
import Logo from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "About | Feel&Note",
  description: "우리는 너무 많이 보고, 너무 빨리 잊습니다. 기록은 흐려지지 않는 지혜가 됩니다.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-main text-text-primary selection:bg-accent/30 flex flex-col items-center">
      
      {/* 1. The Question (Title) */}
      <section className="relative flex min-h-[60vh] w-full flex-col items-center justify-center px-6 py-20 text-center">
        {/* Background Texture */}
        <div className="pointer-events-none absolute inset-0 bg-texture-noise opacity-[0.05]" />
        
        <div className="relative z-10 mb-12 animate-fade-in-up">
          <Logo size="lg" asLink={false} className="opacity-80" />
        </div>

        <h1 className="relative z-10 max-w-3xl animate-fade-in-up font-serif text-3xl font-light leading-relaxed text-text-primary md:text-5xl md:leading-tight [animation-delay:200ms]">
          당신의 감상은<br />
          어디로 흩어집니까?
        </h1>
      </section>

      {/* 2. The Narrative (Essay) */}
      <section className="relative w-full max-w-2xl px-6 pb-40">
        
        {/* Paragraph 1: The Problem */}
        <div className="mb-32 animate-fade-in-up [animation-delay:400ms]">
          <p className="font-serif text-lg leading-loose text-text-secondary md:text-xl md:leading-10">
            우리는 매일 수많은 이야기를 마주합니다.<br />
            책, 영화, 음악, 그리고 게임까지.<br />
            <br />
            하지만 그 순간의 전율은<br />
            다음 콘텐츠에 밀려 너무나 쉽게<br />
            기억 저편으로 사라지고 맙니다.<br />
            <br />
            <span className="text-text-primary">우리는 너무 많이 보고, 너무 빨리 잊습니다.</span>
          </p>
        </div>

        {/* Paragraph 2: The Solution (Feel & Note) */}
        <div className="mb-32">
          <div className="mb-12 flex flex-col gap-12 md:flex-row md:gap-20">
            <div className="flex-1">
              <h2 className="mb-4 font-serif text-2xl text-accent">Feel</h2>
              <p className="text-sm leading-7 text-text-secondary md:text-base md:leading-8">
                감각은 직관적입니다.<br />
                우리가 무언가를 보며 느끼는 기쁨, 슬픔, 충격은<br />
                가장 정직한 반응입니다.<br />
                그 날것의 감정을 외면하지 마세요.
              </p>
            </div>
            <div className="flex-1">
              <h2 className="mb-4 font-serif text-2xl text-accent">Note</h2>
              <p className="text-sm leading-7 text-text-secondary md:text-base md:leading-8">
                기록은 이성적입니다.<br />
                흩어지는 감정을 단어로 붙잡아<br />
                구체적인 형태로 조각하는 과정입니다.<br />
                기록된 감정만이 사유가 됩니다.
              </p>
            </div>
          </div>
          
          <p className="font-serif text-lg leading-loose text-text-primary md:text-xl md:leading-10 text-center">
            Feel&Note는<br />
            당신의 스쳐가는 감상이<br />
            <span className="underline decoration-accent/30 underline-offset-8 decoration-1">견고한 지혜</span>로 남기를 바랍니다.
          </p>
        </div>

        {/* Paragraph 3: The Promise (Epilogue) */}
        <div className="border-t border-white/10 pt-20 text-center">
          <p className="mb-12 text-sm leading-8 text-text-secondary md:text-base md:leading-9">
            이곳은 단순한 메모장이 아닙니다.<br />
            당신의 취향이 역사가 되고,<br />
            당신의 사유가 유산이 되는<br />
            지혜의 신전입니다.
          </p>

          <div className="flex flex-col items-center justify-center gap-2 opacity-60">
             <span className="font-cinzel text-xs tracking-[0.2em] text-accent">From the Builders of</span>
             <span className="font-serif text-sm text-text-primary">Feel&Note Team</span>
          </div>
        </div>

      </section>
    </main>
  );
}
