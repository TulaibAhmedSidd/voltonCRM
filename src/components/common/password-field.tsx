'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type InputProps = Omit<React.ComponentProps<'input'>, 'type'>

/** Password box with an eye button to show / hide what was typed. `defaultVisible` for temporary passwords an admin hands out. */
export function PasswordInput({ defaultVisible = false, className, ...props }: InputProps & { defaultVisible?: boolean }) {
  const [visible, setVisible] = useState(defaultVisible)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('h-11 pe-12 text-base md:text-sm', className)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  )
}

/** Same layout as TextField, for passwords. */
export function PasswordField({ label, name, hint, className, ...props }: { label: string; name: string; hint?: string } & InputProps & { defaultVisible?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name}>{label}</Label>
      <PasswordInput id={name} name={name} {...props} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
