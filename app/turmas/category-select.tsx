'use client'

import { useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'
import { Dialog } from '@/components/dialog'
import { createAgeCategoryAction } from './category-actions'

interface AgeCategory { id: string; name: string; min_age: number; max_age: number }

export function CategorySelect({ initialCategories }: { initialCategories: AgeCategory[] }) {
  const id = useId()
  const [categories, setCategories] = useState(initialCategories)
  const [selected, setSelected] = useState(initialCategories[0]?.id || '')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
      <label htmlFor={`${id}-category`} className="field-label mb-0">Categoria de Idade <span className="text-red-500">*</span></label>
      <button type="button" className="text-link text-xs" onClick={() => { setError(''); setFeedback(''); setOpen(true) }}><Plus size={14} aria-hidden="true" />Adicionar categoria</button>
    </div>
    <select id={`${id}-category`} name="category_id" required value={selected} onChange={event => setSelected(event.target.value)} className="input-escolinha cursor-pointer">
      {!categories.length && <option value="">Adicione uma categoria para continuar</option>}
      {categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.min_age} a {category.max_age} anos)</option>)}
    </select>
    {feedback && <p role="status" className="text-xs text-[var(--text-secondary)] mt-2">{feedback}</p>}
    {open && createPortal(<Dialog open onClose={() => { if (!pending) setOpen(false) }} title="Adicionar categoria de idade" description="Defina o nome e a faixa etária da categoria. Ela ficará disponível para as turmas da escolinha.">
      <form className="space-y-5" onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        const form = new FormData(event.currentTarget)
        setError('')
        startTransition(async () => {
          try {
            const result = await createAgeCategoryAction({
              name: String(form.get('name') || ''),
              min_age: Number(form.get('min_age')),
              max_age: Number(form.get('max_age')),
              description: String(form.get('description') || ''),
            })
            if (result.error || !result.category) { setError(result.error || 'Não foi possível adicionar a categoria.'); return }
            const added = result.category
            setCategories(current => [...current.filter(item => item.id !== added.id), added].sort((a, b) => a.min_age - b.min_age || a.name.localeCompare(b.name, 'pt-BR')))
            setSelected(added.id)
            setFeedback(`Categoria ${added.name} adicionada e selecionada.`)
            setOpen(false)
          } catch { setError('Não foi possível adicionar a categoria. Confira sua conexão e tente novamente.') }
        })
      }}>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <fieldset disabled={pending} className="space-y-5">
          <div><label htmlFor={`${id}-name`} className="field-label">Nome da categoria *</label><input id={`${id}-name`} name="name" required minLength={2} maxLength={100} placeholder="Ex.: Sub-19" className="field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${id}-min`} className="field-label">Idade mínima *</label><input id={`${id}-min`} name="min_age" type="number" required min="0" max="100" step="1" placeholder="18" className="field" /></div>
            <div><label htmlFor={`${id}-max`} className="field-label">Idade máxima *</label><input id={`${id}-max`} name="max_age" type="number" required min="0" max="100" step="1" placeholder="19" className="field" /></div>
          </div>
          <div><label htmlFor={`${id}-description`} className="field-label">Descrição (opcional)</label><textarea id={`${id}-description`} name="description" maxLength={500} rows={3} placeholder="Orientações sobre essa faixa etária" className="field" /></div>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="button button-primary">{pending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}{pending ? 'Salvando…' : 'Salvar categoria'}</button></div>
        </fieldset>
      </form>
    </Dialog>, document.body)}
  </div>
}
