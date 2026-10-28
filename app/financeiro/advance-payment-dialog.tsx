'use client'

import {useState,useTransition} from 'react'
import {Calendar,Check,Loader2,Search,X} from 'lucide-react'
import {ModalFrame} from '@/components/modal-frame'
import {ManualPaymentDialog} from './manual-payment-dialog'
import {prepareAdvanceInvoiceAction,searchAdvanceStudentsAction,type AdvanceInvoice,type AdvanceStudent} from './advance-actions'

const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const monthLabel=(value:string)=>value.split('-').reverse().join('/')
export function AdvancePaymentDialog({initialMonth,initialSearch,todayStr,operatorName,onClose,onFinished}:{
 initialMonth:string;initialSearch:string;todayStr:string;operatorName:string;onClose:()=>void;
 onFinished:(invoice:AdvanceInvoice,paid:boolean)=>void
}){
 const currentMonth=todayStr.slice(0,7)
 const nextMonth=new Date(`${currentMonth}-01T12:00:00Z`);nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1)
 const lastMonth=new Date(`${currentMonth}-01T12:00:00Z`);lastMonth.setUTCMonth(lastMonth.getUTCMonth()+12)
 const [month,setMonth]=useState(initialMonth>currentMonth?initialMonth:nextMonth.toISOString().slice(0,7))
 const [query,setQuery]=useState(initialSearch),[students,setStudents]=useState<AdvanceStudent[]>([]),[selected,setSelected]=useState<AdvanceStudent|null>(null)
 const [searched,setSearched]=useState(false),[error,setError]=useState(''),[pending,start]=useTransition()
 const [invoice,setInvoice]=useState<(AdvanceInvoice&{idempotencyKey:string})|null>(null)
 function search(event:React.FormEvent){
  event.preventDefault();if(pending)return;setError('');setSelected(null)
  start(async()=>{try{const result=await searchAdvanceStudentsAction(query);if(result.success){setStudents(result.students);setSearched(true)}else{setStudents([]);setSearched(false);setError(result.error)}}catch{setError('Não foi possível buscar os atletas. Tente novamente.')}})
 }
 function prepare(){
  if(!selected||pending)return;setError('')
  start(async()=>{try{const result=await prepareAdvanceInvoiceAction(selected.id,month);if(result.success)setInvoice({...result.invoice,idempotencyKey:crypto.randomUUID()});else setError(result.error)}catch{setError('Não foi possível conferir a mensalidade. Tente novamente; uma cobrança existente será reaproveitada.')}})
 }
 // Replace the selection dialog with the existing receipt form, keeping one native modal open at a time.
 if(invoice)return <ManualPaymentDialog key={invoice.idempotencyKey} invoice={invoice} operatorName={operatorName}
  onClose={()=>onFinished(invoice,false)} onSuccess={()=>onFinished(invoice,true)}/>
 return <ModalFrame key="advance-selection" label="Antecipar mensalidade" onClose={()=>{if(!pending)onClose()}} wide>
  <div className="surface max-w-xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
   <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Recebimento antecipado</p><h2 className="section-title mt-2">Antecipar mensalidade</h2><p className="text-sm text-[var(--text-secondary)] mt-2">Escolha o atleta e o mês do pagamento. A cobrança será preparada apenas para ele.</p></div><button type="button" className="icon-button" aria-label="Fechar antecipação" disabled={pending} onClick={onClose}><X size={20}/></button></div>
   <form onSubmit={search} className="space-y-2"><label className="field-label" htmlFor="advance-search">Nome do atleta ou responsável</label><div className="flex gap-2"><input id="advance-search" autoFocus className="input-escolinha min-w-0 flex-1" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);setStudents([]);setSearched(false)}} minLength={2} maxLength={120} required disabled={pending} placeholder="Digite pelo menos 2 caracteres"/><button className="button" disabled={pending||query.trim().length<2}><Search size={17}/>Buscar</button></div></form>
   {searched&&<div className="space-y-2"><p role="status" className="text-xs text-[var(--text-muted)]">{students.length?`${students.length} atleta(s) ativo(s). Selecione o nome correto${students.length===20?' ou refine a pesquisa':''}.`:'Nenhum atleta ativo com matrícula encontrado. Confira o nome e a situação cadastral.'}</p><div className="max-h-56 overflow-y-auto space-y-2">{students.map(student=><button type="button" key={student.id} aria-pressed={selected?.id===student.id} disabled={pending} onClick={()=>setSelected(student)} className={`w-full text-left border rounded-xl p-3 ${selected?.id===student.id?'border-[#c81930] bg-[#c81930]/5':'border-[var(--border-color)]'}`}><span className="flex justify-between gap-3"><strong className="text-sm">{student.name}</strong>{selected?.id===student.id&&<Check size={18} className="shrink-0 text-[#c81930]"/>}</span>{student.guardian_name&&<span className="block text-xs text-[var(--text-muted)] mt-1">Responsável: {student.guardian_name}</span>}<span className="block text-xs mt-1">Mensalidade acordada: {money(student.monthly_fee)} · vencimento dia {student.due_day}</span></button>)}</div></div>}
   <div><label className="field-label" htmlFor="advance-month">Mês de referência da mensalidade</label><input id="advance-month" type="month" required min={currentMonth} max={lastMonth.toISOString().slice(0,7)} value={month} disabled={pending} onChange={e=>setMonth(e.target.value)} className="input-escolinha"/><p className="text-xs text-[var(--text-muted)] mt-2">A data do recebimento será informada na próxima tela, mesmo que a mensalidade seja de um mês futuro.</p></div>
   {selected&&<p className="notice text-sm"><Calendar size={17} className="inline mr-2"/><strong>{selected.name}</strong> · referência {monthLabel(month)}. O valor da cobrança existente será preservado; se ainda não existir, será usado o valor acordado na matrícula.</p>}
   <p className="text-xs text-[var(--text-secondary)]">Preparar a mensalidade não confirma pagamento. Na próxima tela, confira o valor recebido, o desconto e as formas de pagamento antes de confirmar a baixa.</p>
   {error&&<p role="alert" className="notice notice-error">{error}</p>}
   <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-4"><button type="button" className="button" disabled={pending} onClick={onClose}>Cancelar</button><button type="button" className="button button-primary" disabled={pending||!selected||!month||month<currentMonth||month>lastMonth.toISOString().slice(0,7)} onClick={prepare}>{pending?<Loader2 size={17} className="animate-spin"/>:<Calendar size={17}/>}Preparar e abrir baixa</button></div>
  </div>
 </ModalFrame>
}
