import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-3 py-2 bg-bg-card border rounded-lg text-sm text-text-primary
            placeholder:text-text-secondary resize-none
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
              : 'border-border focus:border-accent focus:ring-accent/20'
            }
            ${className}
          `}
          {...props}
        />
        {(error || hint) && (
          <p className={`mt-1.5 text-xs ${hasError ? 'text-red-400' : 'text-text-secondary'}`}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
