'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/dialog'
import { updateClassAction } from './actions'

interface ClassDetails {
  id: string; name: string; category_id: string | null; coach_id: string | null;
  start_time: string | null; end_time: string | null; max_students: number | null;
  shift: string | null; days_of_week: string[]; import_source: { group_key?: string } | null;
}
export function EditClass({ value, categories, coaches }: {
  value: ClassDetails; categories: { id: string; name: string }[];
  coaches: { id: string; name: string; username: string }[];
}) {
  const [open, setOpen] = useState(false), [pending, start] = useTransition(), [error, setError] = useState('')
  const router = useRouter(), imported = Boolean(value.import_source)
  return <>
    <button className="button w-full" onClick={() => { setError(''); setOpen(true) }}>Editar turma</button>
    <Dialog open={open} onClose={() => { if (!pending) setOpen(false) }} title="Editar turma" description={imported ? 'Grupo organizado pelos dias e turno da planilha. Confira a divisão interna, os horários e o treinador responsável.' : 'Atualize os dados da turma.'}>
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault(); const form = new FormData(event.currentTarget); form.set('id', value.id); setError('')
        start(async () => {
          try {
            const result = await updateClassAction(form)
            if (result.error) { setError(result.error); return }
            setOpen(false); router.refresh()
          } catch { setError('Não foi possível salvar. Confira a conexão e tente novamente.') }
        })
      }}>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <fieldset disabled={pending} className="space-y-4">
          <div><label htmlFor={`name-${value.id}`} className="field-label">Nome da turma *</label><input id={`name-${value.id}`} className="input-escolinha" name="name" defaultValue={value.name} required minLength={3} maxLength={120}/></div>
          <div><label htmlFor={`category-${value.id}`} className="field-label">Categoria de idade{!imported && ' *'}</label><select id={`category-${value.id}`} name="category_id" className="input-escolinha" defaultValue={value.category_id || ''} required={!imported}><option value="">A confirmar / grupo com várias idades</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label htmlFor={`coach-${value.id}`} className="field-label">Treinador responsável</label><select id={`coach-${value.id}`} name="coach_id" className="input-escolinha" defaultValue={value.coach_id || ''}><option value="">A definir</option>{coaches.map(c => <option key={c.id} value={c.id}>{c.name} (@{c.username})</option>)}</select><p className="text-xs mt-1 text-[var(--text-muted)]">O treinador selecionado terá acesso à chamada desta turma.</p></div>
          <div><label htmlFor={`shift-${value.id}`} className="field-label">Turno *</label><select id={`shift-${value.id}`} name="shift" className="input-escolinha" defaultValue={value.shift || 'morning'} required><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="evening">Noite</option></select></div>
          <fieldset><legend className="field-label">Dias de treino *</legend><div className="flex flex-wrap gap-3">{[['seg','Seg'],['ter','Ter'],['qua','Qua'],['qui','Qui'],['sex','Sex'],['sab','Sáb'],['dom','Dom']].map(([key,label]) => <label key={key} className="flex gap-1 items-center text-sm"><input type="checkbox" name="days_of_week" value={key} defaultChecked={value.days_of_week.includes(key)}/>{label}</label>)}</div></fieldset>
          <div className="grid grid-cols-2 gap-3"><div><label htmlFor={`start-${value.id}`} className="field-label">Início{!imported && ' *'}</label><input id={`start-${value.id}`} type="time" name="start_time" className="input-escolinha" defaultValue={value.start_time?.slice(0,5) || ''} required={!imported}/></div><div><label htmlFor={`end-${value.id}`} className="field-label">Fim{!imported && ' *'}</label><input id={`end-${value.id}`} type="time" name="end_time" className="input-escolinha" defaultValue={value.end_time?.slice(0,5) || ''} required={!imported}/></div></div>
          <div><label htmlFor={`capacity-${value.id}`} className="field-label">Capacidade máxima{!imported && ' *'}</label><input id={`capacity-${value.id}`} type="number" name="max_students" className="input-escolinha" min="1" max="1000" step="1" defaultValue={value.max_students ?? ''} required={!imported} placeholder="A confirmar"/></div>
          {imported && <p className="text-xs text-[var(--text-muted)]">Complete categoria, horários e capacidade para liberar novas matrículas nesta turma. Os vínculos importados e as chamadas são preservados.</p>}
          <button className="button button-primary w-full" disabled={pending}>{pending ? 'Salvando…' : 'Salvar alterações'}</button>
        </fieldset>
      </form>
    </Dialog>
  </>
}
