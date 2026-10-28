'use client'

import {useEffect,useState,useTransition} from 'react'
import {Calendar,Check,ChevronLeft,ChevronRight,Loader2,Search,X} from 'lucide-react'
import {ModalFrame} from '@/components/modal-frame'
import {ManualPaymentDialog} from './manual-payment-dialog'
import {getAdvanceStudentDirectoryAction,prepareAdvancePeriodsAction,type AdvanceInvoice,type AdvanceStudent,type AdvanceStudentDirectory} from './advance-actions'
import {advanceMonthOptions} from '@/lib/finance/billing-months'

const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const monthLabel=(value:string)=>value.split('-').reverse().join('/')
export interface AdvanceCompletion{months:string[];invoices:AdvanceInvoice[];paidCount:number}
export function AdvancePaymentDialog({initialMonth,initialSearch,todayStr,operatorName,onClose,onFinished}:{
 initialMonth:string;initialSearch:string;todayStr:string;operatorName:string;onClose:()=>void;onFinished:(result:AdvanceCompletion)=>void
}){
 const currentMonth=todayStr.slice(0,7)
 const monthOptions=advanceMonthOptions(todayStr)
 const [months,setMonths]=useState<string[]>([monthOptions.includes(initialMonth)&&initialMonth>currentMonth?initialMonth:monthOptions[1]])
 const [query,setQuery]=useState(initialSearch),[page,setPage]=useState(1),[retry,setRetry]=useState(0)
 const [directory,setDirectory]=useState<AdvanceStudentDirectory|null>(null)
 const [selected,setSelected]=useState<AdvanceStudent[]>([]),[loading,setLoading]=useState(true),[searchError,setSearchError]=useState('')
 const [error,setError]=useState(''),[pending,start]=useTransition()
 const [prepared,setPrepared]=useState<{invoices:AdvanceInvoice[];createdCount:number}|null>(null)
 const [paidIds,setPaidIds]=useState<string[]>([]),[invoice,setInvoice]=useState<(AdvanceInvoice&{idempotencyKey:string})|null>(null)

 useEffect(()=>{
  if(prepared)return
  let active=true
  // Ignore superseded requests and cancelled timers: a slow response cannot replace a newer search.
  const timer=setTimeout(async()=>{
   try{
    const result=await getAdvanceStudentDirectoryAction(query,page)
    if(!active)return
    if(result.success){setDirectory(result.directory);setSearchError('')}else{setDirectory(null);setSearchError(result.error)}
   }catch{if(active){setDirectory(null);setSearchError('Não foi possível carregar os atletas. Tente novamente.')}}
   finally{if(active)setLoading(false)}
  },300)
  return()=>{active=false;clearTimeout(timer)}
 },[query,page,retry,prepared])

 function changeQuery(value:string){setLoading(true);setQuery(value);setPage(1);setSearchError('')}
 function changePage(value:number){setLoading(true);setPage(value);setSearchError('')}
 function toggle(student:AdvanceStudent){
  setError('')
  setSelected(current=>current.some(item=>item.id===student.id)?current.filter(item=>item.id!==student.id):current.length<50?[...current,student]:current)
 }
 const rows=directory?.students||[]
 const allVisibleSelected=rows.length>0&&rows.every(student=>selected.some(item=>item.id===student.id))
 const additionalVisible=rows.filter(student=>!selected.some(item=>item.id===student.id))
 function togglePage(){
  setError('')
  setSelected(current=>rows.every(row=>current.some(student=>student.id===row.id))
   ?current.filter(student=>!rows.some(row=>row.id===student.id))
   :[...current,...rows.filter(row=>!current.some(student=>student.id===row.id))].slice(0,50))
 }
 const chargeCount=selected.length*months.length
 function toggleMonth(value:string){setError('');setMonths(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value].sort())}
 function finish(){if(prepared)onFinished({months,invoices:prepared.invoices,paidCount:paidIds.length});else onClose()}
 function openPayment(value:AdvanceInvoice){setInvoice({...value,idempotencyKey:crypto.randomUUID()})}
 function prepare(){
  if(!selected.length||!months.length||chargeCount>120||pending)return;setError('')
  start(async()=>{
   try{
    const result=await prepareAdvancePeriodsAction(selected.map(student=>student.id),months)
    if(result.success){setPrepared(result);if(result.invoices.length===1)openPayment(result.invoices[0])}else setError(result.error)
   }catch{setError('A conexão foi interrompida. Confira os lançamentos antes de tentar novamente; cobranças existentes serão reaproveitadas.')}
  })
 }
 // Keep each athlete's discount, payment methods, proof and audit separate, with one native dialog open.
 if(invoice)return <ManualPaymentDialog key={invoice.idempotencyKey} invoice={invoice} operatorName={operatorName}
  onClose={()=>setInvoice(null)} onSuccess={()=>{setPaidIds(current=>current.includes(invoice.id)?current:[...current,invoice.id]);setInvoice(null)}}/>

 return <ModalFrame key="advance-selection" label={prepared?'Mensalidades preparadas':'Antecipar mensalidade'} onClose={()=>{if(!pending)finish()}} wide>
  <div className="surface w-full flex flex-col max-h-[92vh] overflow-hidden">
   <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-[var(--border-color)] shrink-0">
    <div><p className="eyebrow">Recebimento antecipado</p><h2 className="section-title mt-2">{prepared?'Mensalidades preparadas':'Antecipar mensalidades'}</h2><p className="text-sm text-[var(--text-secondary)] mt-2">{prepared?`Referências ${months.map(monthLabel).join(', ')} · ${prepared.invoices.length} mensalidade(s) pronta(s) para conferência.`:'Escolha os atletas e marque os meses que deseja antecipar. A pesquisa acompanha o que você digita.'}</p></div>
    <button type="button" className="icon-button shrink-0" aria-label="Fechar antecipação" disabled={pending} onClick={finish}><X size={20}/></button>
   </div>
   <div className="space-y-4 overflow-y-auto min-h-0 p-6 py-4">
   {prepared?<>
    <p role="status" className="notice text-sm">{paidIds.length} recebimento(s) registrado(s) · {prepared.invoices.length-paidIds.length} sem baixa nesta seleção. {prepared.createdCount} cobrança(s) nova(s); as demais já existiam.</p>
    <p className="text-xs text-[var(--text-secondary)]">Abra a baixa de cada atleta para conferir o valor recebido, o desconto, as formas de pagamento e o comprovante. Preparar a seleção não confirma nenhum pagamento.</p>
    <div className="space-y-2 max-h-80 overflow-y-auto">{prepared.invoices.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--border-color)] rounded-xl p-3">
     <div><strong className="text-sm">{item.student.name}</strong><p className="text-xs text-[var(--text-muted)] mt-1">{money(item.amount)} · referência {monthLabel(item.reference_month)}</p></div>
     {paidIds.includes(item.id)?<span className="badge badge-success"><Check size={14}/>Recebimento registrado</span>:<button type="button" className="button button-primary !text-xs" onClick={()=>openPayment(item)}>Dar baixa<span className="sr-only"> de {item.student.name}, referência {monthLabel(item.reference_month)}</span></button>}
    </div>)}</div>
   </>:<>
    <div><label className="field-label" htmlFor="advance-search">Nome do atleta ou responsável</label><div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-[var(--text-muted)] pointer-events-none"/><input id="advance-search" autoFocus type="search" className="input-escolinha !pl-10" value={query} onChange={e=>changeQuery(e.target.value)} maxLength={120} disabled={pending} placeholder="Digite para pesquisar ou selecione na lista…"/></div></div>
    <section aria-label="Lista de atletas para antecipação" aria-busy={loading} className="space-y-2">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-xs text-[var(--text-muted)]">{loading?'Buscando atletas…':directory?`${directory.total} atleta(s) encontrado(s) · página ${directory.page} de ${directory.pages}`:'Lista indisponível'}</p>
      {!loading&&rows.length>0&&<label className="text-xs font-semibold flex items-center gap-2"><input type="checkbox" checked={allVisibleSelected} disabled={pending||(!allVisibleSelected&&selected.length+additionalVisible.length>50)} onChange={togglePage} className="accent-[#c81930]"/>Selecionar esta página</label>}
     </div>
     {loading?<div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]"><Loader2 size={19} className="animate-spin"/>Carregando lista…</div>
      :searchError?<div role="alert" className="notice notice-error text-sm">{searchError}<button type="button" className="button !text-xs mt-2" onClick={()=>{setLoading(true);setRetry(value=>value+1)}}>Tentar novamente</button></div>
      :rows.length?<div className="max-h-60 overflow-y-auto space-y-2">{rows.map(student=>{
       const checked=selected.some(item=>item.id===student.id)
       return <label key={student.id} className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer ${checked?'border-[#c81930] bg-[#c81930]/5':'border-[var(--border-color)]'}`}>
        <input type="checkbox" aria-label={`Selecionar ${student.name}`} checked={checked} disabled={pending||(!checked&&selected.length>=50)} onChange={()=>toggle(student)} className="accent-[#c81930] mt-1 shrink-0"/>
        <span className="min-w-0"><strong className="block text-sm">{student.name}</strong>{student.guardian_name&&<span className="block text-xs text-[var(--text-muted)] mt-1">Responsável: {student.guardian_name}</span>}<span className="block text-xs mt-1">Acordado na matrícula: {money(student.monthly_fee)} · vencimento dia {student.due_day}</span></span>
       </label>
      })}</div>:<p className="py-6 text-sm text-[var(--text-muted)]">Nenhum atleta ativo com matrícula encontrado. Confira a pesquisa e a situação cadastral.</p>}
     {!loading&&directory&&directory.pages>1&&<div className="flex justify-between gap-2"><button type="button" className="button !text-xs" disabled={pending||directory.page<=1} onClick={()=>changePage(directory.page-1)}><ChevronLeft size={15}/>Anterior</button><button type="button" className="button !text-xs" disabled={pending||directory.page>=directory.pages} onClick={()=>changePage(directory.page+1)}>Próxima<ChevronRight size={15}/></button></div>}
    </section>
    <section aria-label="Atletas selecionados" className="rounded-xl bg-[var(--bg-subtle)] p-3 space-y-2">
     <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{selected.length} selecionado(s) <span className="text-xs font-normal text-[var(--text-muted)]">· até 50 por vez</span></p>{selected.length>0&&<button type="button" className="text-link text-xs" disabled={pending} onClick={()=>setSelected([])}>Limpar seleção</button>}</div>
     {selected.length>0?<div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">{selected.map(student=><button type="button" key={student.id} disabled={pending} aria-label={`Remover ${student.name} da seleção`} onClick={()=>toggle(student)} className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs">{student.name}<X size={12} className="shrink-0"/></button>)}</div>:<p className="text-xs text-[var(--text-muted)]">Marque os atletas na lista. A seleção permanece ao pesquisar outros nomes ou trocar de página.</p>}
    </section>
    <fieldset className="space-y-2" disabled={pending}><legend className="field-label">Meses para antecipar</legend><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{monthOptions.map(value=><label key={value} className={`flex items-center gap-2 p-2.5 border rounded-lg text-sm cursor-pointer ${months.includes(value)?'border-[#c81930] bg-[#c81930]/5':'border-[var(--border-color)]'}`}><input type="checkbox" aria-label={`Antecipar ${monthLabel(value)}`} checked={months.includes(value)} disabled={!months.includes(value)&&months.length>=12} onChange={()=>toggleMonth(value)} className="accent-[#c81930]"/><span>{monthLabel(value)}{value===currentMonth&&<span className="text-xs text-[var(--text-muted)]"> · atual</span>}</span></label>)}</div><p className="text-xs text-[var(--text-muted)]">Marque mais de um mês para antecipar várias mensalidades do mesmo atleta. Os meses escolhidos valem para todos os atletas selecionados. A data real de recebimento é informada em cada baixa.</p></fieldset>
    <p role="status" className="notice text-sm">{selected.length} atleta(s) × {months.length} mês(es) = <strong>{chargeCount} mensalidade(s)</strong>.</p>
    {chargeCount>120&&<p role="alert" className="notice notice-error text-sm">Prepare até 120 mensalidades por vez. Reduza a quantidade de atletas ou meses desta seleção.</p>}
    <p className="text-xs text-[var(--text-secondary)]">Serão preparadas apenas as mensalidades dos selecionados. Cobranças existentes serão reaproveitadas. Cada recebimento será conferido e confirmado separadamente.</p>
    {error&&<p role="alert" className="notice notice-error">{error}</p>}
   </>}
   </div>
   <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--border-color)] p-4 px-6 shrink-0">
    {prepared?<button type="button" className="button button-primary" onClick={finish}>Concluir e ver mensalidades</button>:<>
     <button type="button" className="button" disabled={pending} onClick={onClose}>Cancelar</button>
     <button type="button" className="button button-primary" disabled={pending||!chargeCount||chargeCount>120} onClick={prepare}>{pending?<Loader2 size={17} className="animate-spin"/>:<Calendar size={17}/>} {!selected.length?'Selecione os atletas':!months.length?'Selecione os meses':`Preparar ${chargeCount} mensalidade${chargeCount===1?'':'s'}`}</button>
    </>}
   </div>
  </div>
 </ModalFrame>
}
