'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { FinanceFilters } from '@/lib/finance/filters'

export function FinanceFilterPanel({ filters, month, status, counts, classes, total, pending, onApply, onStatus, onClear }: {
  filters: FinanceFilters; month: string; status: string; counts: Record<string,number>;
  classes: {id:string;name:string}[]; total:number; pending:boolean;
  onApply: (month: string, filters: FinanceFilters) => void; onStatus:(status:string)=>void;
  onClear:()=>void;
}) {
  const active = Boolean(filters.q || filters.classId !== 'all' || filters.charge !== 'all' || filters.due !== 'all' || filters.sort !== 'name' || status !== 'all')
  const statuses = [['all','Todas'],['pending','Pendentes de baixa'],['paid','Pagas'],['unconfirmed','A confirmar'],['overdue','Em atraso']]
  return <section className="card-light p-5 space-y-4" aria-labelledby="finance-filter-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="finance-filter-title" className="font-semibold flex items-center gap-2"><SlidersHorizontal size={17} className="text-[#c81930]"/>Encontrar cobranças</h2><p className="text-xs text-[var(--text-muted)] mt-1">Pesquise em todo o mês, incluindo as outras páginas.</p></div>{active && <button type="button" className="button button-quiet text-xs" disabled={pending} onClick={onClear}><X size={14}/>Limpar filtros</button>}</div>
    <form key={JSON.stringify([filters,month])} onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget)
      onApply(String(form.get('month') || month), {q:String(form.get('q') || ''),classId:String(form.get('classId') || 'all'),charge:String(form.get('charge') || 'all'),due:String(form.get('due') || 'all'),sort:String(form.get('sort') || 'name')})
    }}>
      <fieldset disabled={pending} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]"><div><label htmlFor="finance-search" className="field-label">Atleta ou responsável</label><div className="relative"><Search size={17} className="absolute left-3 top-3 text-[var(--text-muted)]"/><input id="finance-search" name="q" type="search" maxLength={120} defaultValue={filters.q} className="input-escolinha !pl-10" placeholder="Digite um nome e pressione Enter"/></div></div><div><label htmlFor="finance-month" className="field-label">Mês de referência</label><input id="finance-month" name="month" type="month" required min="2000-01" max="2099-12" defaultValue={month} className="input-escolinha"/></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div><label htmlFor="finance-class" className="field-label">Turma</label><select id="finance-class" name="classId" defaultValue={filters.classId} className="input-escolinha"><option value="all">Todas as turmas</option><option value="unassigned">Sem turma definida</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label htmlFor="finance-charge" className="field-label">Tipo de cobrança</label><select id="finance-charge" name="charge" defaultValue={filters.charge} className="input-escolinha"><option value="all">Todos os tipos</option><option value="monthly">Mensalidade</option><option value="registration">Matrícula</option></select></div>
          <div><label htmlFor="finance-due" className="field-label">Dia de vencimento</label><select id="finance-due" name="due" defaultValue={filters.due} className="input-escolinha"><option value="all">Todos os dias</option><option value="first">Do dia 1 ao 10</option><option value="middle">Do dia 11 ao 20</option><option value="last">Do dia 21 ao 31</option></select></div>
          <div><label htmlFor="finance-sort" className="field-label">Ordenar por</label><select id="finance-sort" name="sort" defaultValue={filters.sort} className="input-escolinha"><option value="name">Nome do atleta (A–Z)</option><option value="due_date">Vencimento mais próximo</option><option value="amount_desc">Maior valor</option></select></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--text-muted)]">A pesquisa aceita nomes com ou sem acento.</p><button className="button button-primary" disabled={pending}><Search size={16}/>{pending?'Pesquisando…':'Aplicar filtros'}</button></div>
      </fieldset>
    </form>
    <div className="border-t border-[var(--border-color)] pt-4 flex flex-wrap gap-2" role="group" aria-label="Situação das cobranças">{statuses.map(([key,label])=><button key={key} type="button" aria-pressed={status===key} disabled={pending} onClick={()=>onStatus(key)} className={`button text-xs ${status===key?'button-primary':''}`}>{label} ({counts[key] || 0})</button>)}</div>
    <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-[var(--text-secondary)]"><p role="status"><strong>{total}</strong> cobrança(s) encontrada(s){filters.q && <> para “{filters.q}”</>}.</p><p>{filters.sort==='name'?'Ordem alfabética A–Z':filters.sort==='due_date'?'Ordem de vencimento':'Maior valor primeiro'} · 50 por página</p></div>
  </section>
}
