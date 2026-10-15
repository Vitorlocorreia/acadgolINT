'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Undo2, Loader2 } from 'lucide-react'
import { Dialog } from '@/components/dialog'
import { changeStudentDeletionAction } from './deletion-actions'

export function StudentDeleteButton({ studentId, studentName, deletedAt = null }: { studentId: string; studentName: string; deletedAt?: string | null }) {
  const [open, setOpen] = useState(false), [pending, start] = useTransition(), [error, setError] = useState('')
  const router = useRouter(), restoring = Boolean(deletedAt)
  return <>
    <button type="button" className={`button text-xs ${restoring ? '' : '!text-red-700 !border-red-200'}`} aria-label={`${restoring ? 'Recuperar' : 'Excluir'} atleta ${studentName}`} onClick={() => { setError(''); setOpen(true) }}>
      {restoring ? <Undo2 size={14}/> : <Trash2 size={14}/>} {restoring ? 'Recuperar' : 'Excluir'}
    </button>
    <Dialog open={open} onClose={() => { if (!pending) setOpen(false) }} title={restoring ? 'Recuperar atleta' : 'Excluir atleta'} description={studentName}>
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault(); const form = new FormData(event.currentTarget); setError('')
        start(async () => {
          try {
            const result = await changeStudentDeletionAction({studentId,deleted:!restoring,reason:String(form.get('reason') || ''),deletedAt})
            if (result.error) { setError(result.error); return }
            setOpen(false); router.refresh()
          } catch { setError('Não foi possível concluir. Confira a conexão e tente novamente.') }
        })
      }}>
        <p className="text-sm text-[var(--text-secondary)]">{restoring ? 'O cadastro voltará como trancado. Confira a matrícula antes de reativar. Os links antigos e os avisos suspensos continuarão desativados.' : 'O atleta sairá da lista principal, das chamadas e das próximas emissões de mensalidade. Os acessos da família e os avisos pendentes serão suspensos.'}</p>
        <p className="notice text-sm">{restoring ? 'As cobranças e o histórico financeiro foram preservados.' : 'As cobranças já emitidas e os pagamentos serão preservados no financeiro. Você poderá recuperar o cadastro na aba Excluídos.'}</p>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <fieldset disabled={pending} className="space-y-4">
          {!restoring && <div><label htmlFor={`deletion-reason-${studentId}`} className="field-label">Motivo da exclusão *</label><textarea id={`deletion-reason-${studentId}`} name="reason" className="input-escolinha" rows={3} required minLength={5} maxLength={500} placeholder="Ex.: cadastro duplicado ou criado por engano"/></div>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" disabled={pending} className={`button ${restoring ? 'button-primary' : '!bg-red-700 !text-white !border-red-700'}`}>{pending && <Loader2 size={15} className="animate-spin"/>}{pending ? 'Salvando…' : restoring ? 'Recuperar como trancado' : 'Confirmar exclusão'}</button></div>
        </fieldset>
      </form>
    </Dialog>
  </>
}
