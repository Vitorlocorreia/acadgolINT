'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Keeps the existing form content while providing native focus containment and Escape.
export function ModalFrame({ children, label, onClose, wide = false }: {
  children: ReactNode
  label: string
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement as HTMLElement | null
    dialog?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previous
      trigger?.focus()
    }
  }, [])
  return <dialog ref={ref} className={`app-dialog modal-frame ${wide ? 'modal-wide' : ''}`} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    {children}
  </dialog>
}
