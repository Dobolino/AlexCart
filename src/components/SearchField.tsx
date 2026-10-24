import { useId, type InputHTMLAttributes } from 'react'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: string
  onChange: (value: string) => void
  label: string
}
export function SearchField({ value, onChange, label, className = '', ...props }: Props) {
  const id = useId()
  return (
    <div className={`search-field relative ${className}`}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      >
        <Icon path={ICON_PATHS.search} size={18} />
      </span>
      <input
        {...props}
        id={id}
        className="input w-full"
        type="search"
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="absolute right-0 top-0 flex h-full w-11 items-center justify-center"
          aria-label={`${label} leeren`}
          onClick={() => onChange('')}
        >
          <Icon path={ICON_PATHS.close} size={16} />
        </button>
      )}
    </div>
  )
}
