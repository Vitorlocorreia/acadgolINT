'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, Check } from 'lucide-react'

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return <button type="submit" className="button button-primary w-full" disabled={pending}>
    {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
    {pending ? 'Salvando…' : children}
  </button>
}
