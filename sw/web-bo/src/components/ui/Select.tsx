import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', ...props }, ref) => {
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full px-3 py-2 pr-10 bg-bg-card border rounded-lg text-sm text-text-primary
              appearance-none cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${hasError
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                : 'border-border focus:border-accent focus:ring-accent/20'
              }
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </div>
        </div>
        {(error || hint) && (
          <p className={`mt-1.5 text-xs ${hasError ? 'text-red-400' : 'text-text-secondary'}`}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
