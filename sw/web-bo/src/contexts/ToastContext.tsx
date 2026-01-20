'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

// #region Types
type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}
// #endregion

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

// #region Toast Item Component
const TOAST_STYLES: Record<ToastType, { bg: string; icon: typeof CheckCircle }> = {
  success: { bg: 'bg-green-500', icon: CheckCircle },
  error: { bg: 'bg-red-500', icon: XCircle },
  info: { bg: 'bg-blue-500', icon: AlertCircle },
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { bg, icon: Icon } = TOAST_STYLES[toast.type]

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${bg} text-white animate-toast-in`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
// #endregion

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])

    // 3초 후 자동 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
