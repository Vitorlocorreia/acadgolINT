'use client'

import { useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { ModalFrame } from './modal-frame'

export function CreatePanel({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="workspace-create">
    <button type="button" className="button button-primary" aria-haspopup="dialog" onClick={() => setOpen(true)}><Plus size={18} />{title}</button>
    {open && <ModalFrame label={title} onClose={() => setOpen(false)} wide>
      <div className="create-panel-content">
        <button type="button" className="icon-button create-panel-close" aria-label="Fechar formulário" onClick={() => setOpen(false)}><X size={18} /></button>
        {children}
      </div>
    </ModalFrame>}
  </div>
}
