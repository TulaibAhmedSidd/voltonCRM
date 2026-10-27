'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DECIMAL_PATTERN, INTEGER_PATTERN, cleanNumberText, numberFromText, numberProblem, textFromNumber } from '@/lib/numeric'
import { cn } from '@/lib/utils'

type InputRest = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'pattern' | 'inputMode'>

/**
 * Controlled number box (quotation builder, …). A text box that only takes digits (and one "." with `decimals`),
 * never keeps a leading 0, and shows 0 as empty. Calls `onValueChange` with the number.
 */
export function NumberInput({ value, onValueChange, decimals = false, min, max, placeholder = '0', className, ...rest }: InputRest & { value: number; onValueChange: (n: number) => void; decimals?: boolean; min?: number; max?: number }) {
  const [text, setText] = useState(textFromNumber(value))
  const [seen, setSeen] = useState(value)
  // Value changed from outside (product picked, form reset): show it — unless it is what is being typed.
  if (value !== seen) {
    setSeen(value)
    if (numberFromText(text) !== (Number.isFinite(value) ? value : 0)) setText(textFromNumber(value))
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      pattern={decimals ? DECIMAL_PATTERN : INTEGER_PATTERN}
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      className={className}
      onChange={(e) => {
        const clean = cleanNumberText(e.target.value, { decimals })
        setText(clean)
        let n = numberFromText(clean)
        if (max !== undefined && n > max) n = max
        if (min !== undefined && clean && n < min) n = min
        onValueChange(n)
      }}
    />
  )
}

/**
 * Form number field (server forms: lead page, Team timings, visits…): label + text box that cleans what is typed and
 * checks min / max / required before the form is sent. The form receives plain digits, e.g. "31000".
 */
export function NumberField({
  label,
  name,
  hint,
  className,
  id,
  decimals = false,
  min,
  max,
  required,
  defaultValue,
  placeholder,
  ...rest
}: InputRest & { label: string; name: string; hint?: string; decimals?: boolean; min?: number; max?: number; defaultValue?: number | string | null }) {
  const fieldId = id ?? name
  const initial = defaultValue === null || defaultValue === undefined || defaultValue === '' ? '' : cleanNumberText(String(defaultValue), { decimals })
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  // Forms that clear after saving (form.reset()) must clear this box too.
  useEffect(() => {
    const form = ref.current?.form
    if (!form) return
    const onReset = () => {
      setText(initial)
      setError(null)
      ref.current?.setCustomValidity('')
    }
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [initial])
  const check = (el: HTMLInputElement, value: string) => {
    const problem = numberProblem(value, { min, max, required, label })
    el.setCustomValidity(problem ?? '')
    return problem
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        {...rest}
        ref={ref}
        id={fieldId}
        name={name}
        type="text"
        inputMode={decimals ? 'decimal' : 'numeric'}
        pattern={decimals ? DECIMAL_PATTERN : INTEGER_PATTERN}
        autoComplete="off"
        required={required}
        placeholder={placeholder ?? (min !== undefined && min > 0 ? String(min) : '0')}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className="h-11 text-base md:text-sm"
        onChange={(e) => {
          const clean = cleanNumberText(e.target.value, { decimals })
          setText(clean)
          setError(check(e.currentTarget, clean))
        }}
        onInvalid={(e) => setError(check(e.currentTarget, text) ?? 'Enter a number')}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
