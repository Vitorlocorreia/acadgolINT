'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Loader2, NotebookPen, Pencil, Plus, Search, Shirt } from 'lucide-react'
import { Dialog } from '@/components/dialog'
import { formatMoney } from '@/lib/format'
import { saveEnrollmentPlanAction } from './actions'
import type { EnrollmentPlan } from './types'

export function PlansClient({ plans }: { plans: EnrollmentPlan[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [editor, setEditor] = useState<{ plan: EnrollmentPlan | null } | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const active = plans.filter(plan => plan.is_active).length
  const visible = plans.filter(plan => (status === 'all' || Boolean(plan.is_active) === (status === 'active')) && plan.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const plan = editor?.plan

  function openEditor(value: EnrollmentPlan | null) {
    setError('')
    setFeedback('')
    setEditor({ plan: value })
  }

  return <>
    {feedback && <p role="status" className="notice">{feedback}</p>}
    <div className="surface p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-[#c81930]/10 p-3 text-[#c81930]"><NotebookPen size={22} /></span>
        <div><p className="font-semibold">{active} {active === 1 ? 'plano ativo' : 'planos ativos'}</p><p className="text-sm text-[var(--text-muted)]">Disponíveis no cadastro do atleta</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/alunos/novo" className="button">Matricular atleta</Link>
        <button type="button" className="button button-primary" onClick={() => openEditor(null)}><Plus size={18} />Novo plano</button>
      </div>
    </div>
    <p className="text-sm text-[var(--text-secondary)]">Os preços do plano sugerem os valores de novas matrículas. Editar ou desativar um plano preserva os valores já acordados com os atletas e suas cobranças.</p>
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search size={18} className="absolute left-3 top-3 text-[var(--text-muted)]" aria-hidden="true" />
        <input aria-label="Buscar plano por nome" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar plano por nome…" className="field pl-10" />
      </div>
      <select aria-label="Filtrar planos por situação" className="field sm:max-w-52" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="active">Ativos ({active})</option><option value="inactive">Inativos ({plans.length - active})</option><option value="all">Todos os planos ({plans.length})</option>
      </select>
    </div>
    {!visible.length ? <div className="surface empty-state"><NotebookPen size={36} /><strong>{plans.length ? 'Nenhum plano neste filtro' : 'Cadastre o primeiro plano'}</strong><p>{plans.length ? 'Ajuste a busca ou a situação para encontrar o plano.' : 'Defina a matrícula e a mensalidade para começar a receber atletas.'}</p>{!plans.length && <button className="button button-primary" onClick={() => openEditor(null)}>Criar plano</button>}</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {visible.map(item => <article key={item.id} className="surface p-5 flex flex-col gap-5">
        <div className="flex justify-between items-start gap-3"><h2 className="font-semibold text-lg leading-snug">{item.name}</h2><span className={`badge shrink-0 ${item.is_active ? 'badge-success' : ''}`}>{item.is_active ? 'Ativo' : 'Inativo'}</span></div>
        <div><p className="text-xs text-[var(--text-muted)]">Mensalidade</p><p className="text-3xl font-semibold tracking-tight mt-1">{formatMoney(item.price)}<span className="text-sm font-normal text-[var(--text-muted)]"> /mês</span></p><p className="text-sm text-[var(--text-secondary)] mt-2">Matrícula: {Number(item.registration_fee) > 0 ? formatMoney(Number(item.registration_fee)) : 'isenta'}</p></div>
        <div className="space-y-2 text-sm text-[var(--text-secondary)] flex-1">
          <p className="flex items-center gap-2"><CalendarDays size={16} />{item.frequency_per_week ?? 2} treinos por semana · {item.duration_months ?? 1} {(item.duration_months ?? 1) === 1 ? 'mês' : 'meses'}</p>
          <p className="flex items-center gap-2"><Shirt size={16} />{item.includes_uniform ? 'Kit de uniforme incluído' : 'Uniforme à parte'}</p>
          {Number(item.sibling_discount_percent) > 0 && <p className="text-xs text-[var(--text-muted)]">Desconto sugerido para irmãos: {Number(item.sibling_discount_percent)}%</p>}
        </div>
        <button type="button" className="button w-full" onClick={() => openEditor(item)} aria-label={`Editar plano ${item.name}`}><Pencil size={16} />Editar plano</button>
      </article>)}
    </div>}
    <Dialog open={!!editor} onClose={() => { if (!pending) setEditor(null) }} title={plan ? 'Editar plano de matrícula' : 'Novo plano de matrícula'} description="Defina os valores sugeridos e os benefícios para novas matrículas.">
      {editor && <form key={plan?.id || 'new'} className="space-y-5" onSubmit={event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setError('')
        startTransition(async () => {
          try {
            const result = await saveEnrollmentPlanAction({
              ...(plan ? { id: plan.id } : {}),
              name: String(form.get('name') || ''),
              price: Number(form.get('price')),
              registration_fee: Number(form.get('registration_fee')),
              frequency_per_week: Number(form.get('frequency_per_week')),
              duration_months: Number(form.get('duration_months')),
              sibling_discount_percent: Number(form.get('sibling_discount_percent')),
              includes_uniform: form.get('includes_uniform') === 'on',
              is_active: form.get('is_active') === 'on',
            })
            if (result.error) { setError(result.error); return }
            setFeedback(plan ? 'Plano atualizado. Os valores das matrículas existentes foram preservados.' : 'Plano criado e disponível conforme a situação escolhida.')
            setEditor(null)
            router.refresh()
          } catch { setError('Não foi possível salvar o plano. Confira sua conexão e tente novamente.') }
        })
      }}>
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <fieldset disabled={pending} className="space-y-5">
          <div><label htmlFor="plan-name" className="field-label">Nome do plano *</label><input id="plan-name" name="name" required minLength={2} maxLength={120} defaultValue={plan?.name || ''} placeholder="Ex.: Mensal · 2 treinos por semana" className="field" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label htmlFor="plan-price" className="field-label">Mensalidade (R$) *</label><input id="plan-price" name="price" type="number" inputMode="decimal" required min="0" max="100000" step="0.01" defaultValue={plan?.price ?? ''} className="field" /></div>
            <div><label htmlFor="plan-registration" className="field-label">Matrícula (R$) *</label><input id="plan-registration" name="registration_fee" type="number" inputMode="decimal" required min="0" max="100000" step="0.01" defaultValue={plan?.registration_fee ?? 0} className="field" /><p className="text-xs text-[var(--text-muted)] mt-1">Use 0 para matrícula isenta.</p></div>
            <div><label htmlFor="plan-frequency" className="field-label">Treinos por semana *</label><select id="plan-frequency" name="frequency_per_week" defaultValue={plan?.frequency_per_week ?? 2} className="field">{Array.from({ length: 7 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day} {day === 1 ? 'treino' : 'treinos'}</option>)}</select></div>
            <div><label htmlFor="plan-duration" className="field-label">Prazo do plano (meses) *</label><input id="plan-duration" name="duration_months" type="number" required min="1" max="36" step="1" defaultValue={plan?.duration_months ?? 1} className="field" /></div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">A matrícula é cobrada no mês de entrada. A mensalidade começa no mês seguinte e é cobrada a cada mês, inclusive nos planos com prazo maior.</p>
          <details className="rounded-xl border border-[var(--border-color)] p-4"><summary className="cursor-pointer text-sm font-semibold">Benefícios do plano</summary><div className="space-y-4 mt-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="includes_uniform" defaultChecked={Boolean(plan?.includes_uniform)} />Incluir kit de uniforme</label>
            <p className="text-xs text-[var(--text-muted)]">A matrícula com kit exige estoque disponível no tamanho do atleta.</p>
            <div><label htmlFor="plan-sibling" className="field-label">Desconto sugerido para irmãos (%)</label><input id="plan-sibling" name="sibling_discount_percent" type="number" required min="0" max="100" step="0.01" defaultValue={plan?.sibling_discount_percent ?? 0} className="field" /><p className="text-xs text-[var(--text-muted)] mt-1">Referência para a secretaria. O desconto é informado manualmente no valor acordado ou na baixa.</p></div>
          </div></details>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="is_active" defaultChecked={plan ? Boolean(plan.is_active) : true} className="mt-1" /><span><strong className="block">Disponível para novas matrículas</strong><span className="text-[var(--text-muted)]">Desmarque para desativar. Os vínculos e cobranças existentes continuam preservados.</span></span></label>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className="button" onClick={() => setEditor(null)}>Cancelar</button><button type="submit" className="button button-primary">{pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{pending ? 'Salvando…' : 'Salvar plano'}</button></div>
        </fieldset>
      </form>}
    </Dialog>
  </>
}
