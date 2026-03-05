/*
  파일명: /components/lab/CoupangPartners.tsx
  기능: 쿠팡 파트너스 어필리에이트 링크 CRUD
  책임: 상품 링크를 등록·수정·삭제하고 구매 진행 상황을 추적한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ExternalLink, Pencil, Trash2, Check, X, ShoppingCart } from "lucide-react";

interface CoupangItem {
  id: string;
  name: string;
  url: string;
  price: number;
  purchased: boolean;
  createdAt: string;
}

const STORAGE_KEY = "coupang-partners-items";
const GOAL = 150000;

function loadItems(): CoupangItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: CoupangItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function CoupangPartners() {
  const [items, setItems] = useState<CoupangItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    setItems(loadItems());
    setMounted(true);
  }, []);

  const persist = useCallback((next: CoupangItem[]) => {
    setItems(next);
    saveItems(next);
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName("");
    setUrl("");
    setPrice("");
  };

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) return;
    const priceNum = parseInt(price) || 0;

    if (editId) {
      persist(items.map((it) => (it.id === editId ? { ...it, name: name.trim(), url: url.trim(), price: priceNum } : it)));
    } else {
      const newItem: CoupangItem = {
        id: crypto.randomUUID(),
        name: name.trim(),
        url: url.trim(),
        price: priceNum,
        purchased: false,
        createdAt: new Date().toISOString(),
      };
      persist([newItem, ...items]);
    }
    resetForm();
  };

  const handleEdit = (item: CoupangItem) => {
    setEditId(item.id);
    setName(item.name);
    setUrl(item.url);
    setPrice(item.price.toString());
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    persist(items.filter((it) => it.id !== id));
  };

  const togglePurchased = (id: string) => {
    persist(items.map((it) => (it.id === id ? { ...it, purchased: !it.purchased } : it)));
  };

  const purchasedTotal = items.filter((it) => it.purchased).reduce((sum, it) => sum + it.price, 0);
  const progress = Math.min((purchasedTotal / GOAL) * 100, 100);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* 진행률 바 */}
      <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-secondary">구매 실적</span>
          <span className="text-sm font-mono text-accent">
            {formatPrice(purchasedTotal)} / {formatPrice(GOAL)}
          </span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent/80 to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress >= 100 && (
          <p className="text-xs text-green-400 mt-2 text-center">목표 달성 완료!</p>
        )}
      </div>

      {/* 추가 버튼 / 폼 */}
      {showForm ? (
        <div className="p-4 rounded-xl border border-accent/20 bg-white/[0.02] space-y-3">
          <input
            type="text"
            placeholder="상품명"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/50 focus:outline-none"
          />
          <input
            type="text"
            placeholder="쿠팡 파트너스 링크"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/50 focus:outline-none"
          />
          <input
            type="number"
            placeholder="가격 (원)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/50 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !url.trim()}
              className="flex-1 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {editId ? "수정" : "등록"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-white/5 text-text-secondary text-sm hover:bg-white/10 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl border border-dashed border-accent/30 text-accent/60 text-sm flex items-center justify-center gap-2 hover:border-accent/50 hover:text-accent/80 transition-colors"
        >
          <Plus size={16} />
          상품 추가
        </button>
      )}

      {/* 상품 목록 */}
      {items.length === 0 ? (
        <p className="text-center text-text-tertiary text-sm py-8">등록된 상품이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                item.purchased
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-white/5 bg-white/[0.02] hover:border-accent/20"
              }`}
            >
              {/* 구매 완료 토글 */}
              <button
                onClick={() => togglePurchased(item.id)}
                className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  item.purchased
                    ? "border-green-500 bg-green-500/20 text-green-400"
                    : "border-white/20 hover:border-accent/50"
                }`}
              >
                {item.purchased && <Check size={12} />}
              </button>

              {/* 상품 정보 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${item.purchased ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                  {item.name}
                </p>
                {item.price > 0 && (
                  <p className="text-xs text-text-tertiary font-mono">{formatPrice(item.price)}</p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors"
                  title="수정"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-colors"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 구매 링크 */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                <ShoppingCart size={13} />
                구매
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 요약 */}
      {items.length > 0 && (
        <div className="flex justify-between text-xs text-text-tertiary px-1">
          <span>총 {items.length}건 (구매 {items.filter((it) => it.purchased).length}건)</span>
          <span>잔여: {formatPrice(Math.max(GOAL - purchasedTotal, 0))}</span>
        </div>
      )}
    </div>
  );
}
