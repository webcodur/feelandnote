import { SECTION_CLS, HEADER_CLS, INPUT_CLS, BADGE_CLS, FIELD_CLS, FIELD_LABEL_CLS } from './constants'

// --- Accordion ---
export function Section({ id, title, badge, open, onToggle, children }: {
  id: string; title: string; badge?: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode
}) {
  return (
    <section className={SECTION_CLS}>
      <div className={HEADER_CLS} onClick={() => onToggle(id)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent tracking-widest">{title}</span>
          {badge && <span className="text-[10px] text-text-dim">{badge}</span>}
        </div>
        <span className="text-text-dim text-xs">{open ? '▼' : '▶'}</span>
      </div>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  )
}

export function TextField({ label, value, onChange, rows, readOnly, placeholder }: {
  label: string; value: string; onChange?: (v: string) => void; rows?: number; readOnly?: boolean; placeholder?: string
}) {
  const isTA = rows && rows > 1
  return (
    <div className={`${FIELD_CLS} ${isTA ? 'items-start' : ''}`}>
      <label className={`${FIELD_LABEL_CLS} ${isTA ? 'pt-2' : ''}`}>{label}</label>
      <div className="flex-1">
        {isTA ? (
          <textarea value={value ?? ''} onChange={e => onChange?.(e.target.value)} rows={rows}
            readOnly={readOnly} placeholder={placeholder}
            className={`${INPUT_CLS} resize-y ${readOnly ? 'text-text-dim cursor-default' : ''}`} />
        ) : (
          <input value={value ?? ''} onChange={e => onChange?.(e.target.value)} type="text"
            readOnly={readOnly} placeholder={placeholder}
            className={`${INPUT_CLS} ${readOnly ? 'text-text-dim cursor-default' : ''}`} />
        )}
      </div>
    </div>
  )
}

export function FieldWithDuration({ label, value, onChange, duration, rows }: {
  label: string; value: string; onChange: (v: string) => void; duration?: number; rows?: number
}) {
  const isTA = rows && rows > 1
  return (
    <div className={`${FIELD_CLS} ${isTA ? 'items-start' : ''}`}>
      <label className={`${FIELD_LABEL_CLS} ${isTA ? 'pt-2' : ''}`}>
        {label}
        {duration != null && <span className={`block ${BADGE_CLS} mt-1 text-center`}>{duration}s</span>}
      </label>
      <div className="flex-1">
        {(rows && rows > 1) ? (
          <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={rows} className={`${INPUT_CLS} resize-y`} />
        ) : (
          <input value={value ?? ''} onChange={e => onChange(e.target.value)} className={INPUT_CLS} />
        )}
      </div>
    </div>
  )
}
