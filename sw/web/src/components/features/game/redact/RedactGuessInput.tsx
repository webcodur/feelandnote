'use client';

import { useCallback, useRef, useState } from 'react';
import { Send, User } from 'lucide-react';

interface Props {
  onSubmit: (word: string) => void;
  placeholder: string;
  disabled?: boolean;
  isIdentityMode?: boolean;
}

export default function RedactGuessInput({ onSubmit, placeholder, disabled, isIdentityMode }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      setValue('');
      inputRef.current?.focus();
    },
    [value, onSubmit, disabled]
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        {isIdentityMode && (
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" aria-hidden />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          className={`w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 disabled:opacity-50 ${
            isIdentityMode
              ? 'border-amber-500/40 pl-9 focus:ring-amber-400/50'
              : 'border-white/15 focus:ring-blue-400/50'
          }`}
          aria-label={placeholder}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-text-primary hover:border-white/30 hover:bg-white/15 disabled:opacity-30 active:scale-[0.97]"
        aria-label="Submit guess"
      >
        <Send className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}
