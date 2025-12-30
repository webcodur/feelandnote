"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";

interface SettingsContentProps {
  apiKey: string | null;
  onSave: (key: string) => Promise<void>;
  isSaving: boolean;
}

export default function SettingsContent({ apiKey, onSave, isSaving }: SettingsContentProps) {
  const [inputValue, setInputValue] = useState(apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    try {
      await onSave(inputValue);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // 에러는 상위에서 처리
    }
  };

  const hasChanges = inputValue !== (apiKey || "");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AI 설정 카드 */}
      <Card className="p-0">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h3 className="font-semibold">AI 설정</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* 안내 텍스트 */}
          <p className="text-sm text-text-secondary">
            Gemini API 키를 등록하면 리뷰 예시 생성, 줄거리 요약 등 AI 기능을 사용할 수 있다.
          </p>

          {/* API 키 입력 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Gemini API 키</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="API 키를 입력하세요"
                  className="w-full h-10 bg-black/20 border border-border rounded-lg px-3 pr-10 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : "저장"}
              </Button>
            </div>

            {/* 저장 성공 메시지 */}
            {saveSuccess && (
              <p className="text-sm text-green-400">저장되었습니다.</p>
            )}
          </div>

          {/* API 키 발급 링크 */}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink size={14} />
            Google AI Studio에서 API 키 발급받기
          </a>

          {/* 안내사항 */}
          <div className="p-3 bg-white/5 rounded-lg text-xs text-text-secondary space-y-1">
            <p>• API 키는 암호화되어 안전하게 저장된다.</p>
            <p>• 무료 할당량 내에서 사용 가능하다.</p>
            <p>• 키를 삭제하려면 입력란을 비우고 저장하면 된다.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
