'use client'
import {useEffect,useState,useTransition} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {Check,History,Loader2,LockKeyhole,RefreshCw,RotateCcw,X} from 'lucide-react'
import {ModalFrame} from '@/components/modal-frame'
import {cashMethods,cashLabels,reconciliation,type CashDayReport,type CashSource,type CashClosure} from '@/lib/finance/cash-closing'
import {getCashDayReportAction,closeCashDayAction,reopenCashDayAction} from './cash-closing-actions'
import {getBrDateStr} from './calc'
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateLabel=(date:string)=>date.split('-').reverse().join('/')
const moment=(date:string)=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'short'})

function CashCloseDialog({source,initialOpening=0,onClose,onSuccess,onReload}:{source:CashSource;initialOpening?:number;onClose:()=>void;onSuccess:()=>void;onReload:()=>void}){
 const [key]=useState(()=>crypto.randomUUID()),[opening,setOpening]=useState(String(initialOpening)),[counted,setCounted]=useState({dinheiro:'',pix:'',debito:'',credito:''})
 const [reason,setReason]=useState(''),[notes,setNotes]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[pending,start]=useTransition()
 const amounts={dinheiro:Number(counted.dinheiro),pix:Number(counted.pix),debito:Number(counted.debito),credito:Number(counted.credito)}
 const {expected,difference,hasDifference}=reconciliation(source.totals,Number(opening)||0,amounts)
 const allCounted=cashMethods.every(method=>counted[method]!==''&&Number.isFinite(amounts[method]))
 const invalid=!confirmed||opening===''||!allCounted||(hasDifference&&reason.trim().length<5)
 function submit(event:React.FormEvent){
  event.preventDefault();if(invalid||pending)return;setError('')
  start(async()=>{try{const result=await closeCashDayAction({date:source.date,key,fingerprint:source.fingerprint,openingCash:Number(opening),counted:amounts,differenceReason:reason,notes});if(result.success)onSuccess();else setError(result.error)}catch{setError('A conexão foi interrompida. Tente novamente sem alterar a conferência ou atualize o dia para consultar se o fechamento foi salvo.')}})
 }
 return <ModalFrame label="Fechar caixa do dia" onClose={()=>{if(!pending)onClose()}} wide><div className="surface p-6 space-y-4 max-h-[92vh] overflow-y-auto">
  <div className="flex justify-between items-start gap-3"><div><p className="eyebrow">Conferência definitiva</p><h2 className="section-title mt-2">Fechar caixa de {dateLabel(source.date)}</h2><p className="text-sm mt-2">{source.count} recebimento(s) · entradas do dia: {money(source.totals.total)}.</p></div><button type="button" className="icon-button shrink-0" aria-label="Cancelar fechamento" disabled={pending} onClick={onClose}><X size={20}/></button></div>
  <form onSubmit={submit} className="space-y-4"><fieldset disabled={pending} className="space-y-4">
   <div><label className="field-label" htmlFor="cash-opening">Fundo de troco inicial em dinheiro (R$)</label><input id="cash-opening" type="number" min="0" max="1000000" step="0.01" required value={opening} onChange={event=>setOpening(event.target.value)} className="input-escolinha"/><p className="text-xs text-[var(--text-muted)] mt-1">Informe somente o dinheiro que já estava na gaveta antes dos recebimentos. Use 0 se não havia fundo.</p></div>
   <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Forma</th><th>Esperado</th><th>Conferido (R$)</th><th>Diferença</th></tr></thead><tbody>{cashMethods.map(method=><tr key={method}><td><label htmlFor={`cash-counted-${method}`}>{cashLabels[method]}</label></td><td>{money(expected[method])}</td><td><input id={`cash-counted-${method}`} aria-label={`${cashLabels[method]} conferido`} className="input-escolinha min-w-28" type="number" min="0" max="1000000000" step="0.01" required placeholder="0,00" value={counted[method]} onChange={event=>setCounted(current=>({...current,[method]:event.target.value}))}/></td><td className={difference[method]!==0?'text-amber-700 font-semibold':''}>{counted[method]===''?'—':money(difference[method])}</td></tr>)}</tbody></table></div>
   <p className="text-xs text-[var(--text-muted)]">Dinheiro esperado = fundo inicial + dinheiro recebido. PIX e cartões devem ser conferidos no extrato e nos comprovantes. A diferença é o conferido menos o esperado.</p>
   {hasDifference&&allCounted&&<div><label className="field-label" htmlFor="cash-difference-reason">Justificativa da diferença *</label><textarea id="cash-difference-reason" required minLength={5} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} className="input-escolinha" rows={2}/><p className="text-xs text-[var(--text-muted)] mt-1">A diferença permanece registrada, inclusive quando uma sobra em uma forma compensa a falta em outra.</p></div>}
   <div><label className="field-label" htmlFor="cash-notes">Observação (opcional)</label><textarea id="cash-notes" maxLength={1000} value={notes} onChange={event=>setNotes(event.target.value)} className="input-escolinha" rows={2}/></div>
   <label className="flex items-start gap-2 text-sm font-medium"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} required className="accent-[#c81930] mt-1"/>Conferi os valores e entendo que novas baixas e estornos deste dia exigirão reabertura autorizada.</label>
  </fieldset>{error&&<div role="alert" className="notice notice-error text-sm">{error}<button type="button" className="button !text-xs mt-2" disabled={pending} onClick={onReload}>Atualizar conferência</button></div>}
  <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--border-color)] pt-4"><button type="button" className="button" disabled={pending} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={pending||invalid}>{pending?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>}Confirmar fechamento</button></div>
  </form>
 </div></ModalFrame>
}

function ReopenDialog({closure,onClose,onSuccess}:{closure:CashClosure;onClose:()=>void;onSuccess:()=>void}){
 const [reason,setReason]=useState(''),[error,setError]=useState(''),[pending,start]=useTransition()
 function submit(event:React.FormEvent){event.preventDefault();if(pending||reason.trim().length<5)return;setError('');start(async()=>{try{const result=await reopenCashDayAction(closure.id,reason);if(result.success)onSuccess();else setError(result.error)}catch{setError('Não foi possível confirmar a reabertura. Atualize a consulta antes de tentar novamente.')}})}
 return <ModalFrame label="Reabrir caixa do dia" onClose={()=>{if(!pending)onClose()}}><div className="surface p-6 space-y-4"><div className="flex items-start justify-between gap-3"><h2 className="section-title">Reabrir caixa de {dateLabel(closure.business_date)}</h2><button type="button" className="icon-button shrink-0" aria-label="Cancelar reabertura" disabled={pending} onClick={onClose}><X size={20}/></button></div><p className="text-sm">O fechamento nº {closure.revision} será preservado. Após corrigir os lançamentos, faça uma nova conferência para fechar novamente.</p><form onSubmit={submit} className="space-y-4"><label className="field-label" htmlFor="cash-reopen-reason">Motivo da reabertura *</label><textarea id="cash-reopen-reason" className="input-escolinha" required minLength={5} maxLength={500} value={reason} disabled={pending} onChange={event=>setReason(event.target.value)} rows={3}/>{error&&<p role="alert" className="notice notice-error">{error}</p>}<div className="flex justify-end gap-3"><button type="button" className="button" disabled={pending} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={pending||reason.trim().length<5}>{pending?<Loader2 size={16} className="animate-spin"/>:<RotateCcw size={16}/>}Reabrir com justificativa</button></div></form></div></ModalFrame>
}

function CashHistoryEntry({closure}:{closure:CashClosure}){
 const different=cashMethods.filter(method=>closure.difference[method]!==0)
 return <article className="rounded-xl border border-[var(--border-color)] p-4 space-y-2 text-sm">
  <div className="flex flex-wrap justify-between items-start gap-2"><strong>Fechamento nº {closure.revision}</strong><Link className="text-link !text-xs" href={`/financeiro/caixa/${closure.id}`} target="_blank" rel="noopener noreferrer">Ver e imprimir fechamento</Link></div>
  <p>{closure.actor_snapshot.name} · {moment(closure.closed_at)}</p>
  <p>Esperado: {money(closure.expected.total)} · Conferido: {money(closure.counted.total)} · Diferença: <strong>{money(closure.difference.total)}</strong></p>
  {different.length>0&&<p className="text-amber-700">Diferenças por forma: {different.map(method=>`${cashLabels[method]}: ${money(closure.difference[method])}`).join(' · ')}.</p>}
  {closure.difference_reason&&<p>Justificativa: {closure.difference_reason}</p>}{closure.notes&&<p>Observação: {closure.notes}</p>}
  {closure.reopening&&<div className="notice text-xs"><p>Reaberto por {closure.reopening.actor.name} em {moment(closure.reopening.at)}.</p><p className="mt-1">Motivo: {closure.reopening.reason}</p></div>}
 </article>
}

export function CashDayClosurePanel({date,today,readOnly=false}:{date:string;today:string;readOnly?:boolean}){
 const router=useRouter(),[report,setReport]=useState<CashDayReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0)
 const [showClose,setShowClose]=useState(false),[showReopen,setShowReopen]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let active=true;getCashDayReportAction(date).then(result=>{if(!active)return;if(result.success){setReport(result.report);setError('')}else{setReport(null);setError(result.error)}}).catch(()=>{if(active){setReport(null);setError('Não foi possível conferir o estado do caixa. Tente novamente antes de fechar.')}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[date,reload])
 function refresh(){setLoading(true);setReload(value=>value+1)}
 function completed(text:string){setShowClose(false);setShowReopen(false);setMessage(text);refresh();router.refresh()}
 return <section aria-label="Fechamento do caixa diário" className="surface p-5 space-y-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Conferência e histórico</p><h2 className="section-title mt-2">Fechamento do caixa</h2><p className="text-sm text-[var(--text-secondary)] mt-2">Caixa geral de {dateLabel(date)} · todos os usuários · horário de Recife.</p></div><button type="button" className="button !text-xs" disabled={loading} onClick={refresh}><RefreshCw size={15} className={loading?'animate-spin':''}/>Atualizar conferência</button></div>
  {message&&<p role="status" className="notice text-sm">{message}</p>}
  {loading?<p role="status" className="text-sm flex items-center gap-2"><Loader2 size={17} className="animate-spin"/>Conferindo o caixa…</p>:error?<p role="alert" className="notice notice-error text-sm">{error}</p>:report&&<>
   <div className="flex flex-wrap items-center justify-between gap-3"><div><span className={`badge ${report.state==='closed'?'badge-success':'badge-warning'}`}>{report.state==='closed'?'Fechado':report.history.length?'Reaberto · aguarda nova conferência':'Aberto'}</span><p className="text-sm mt-2">{report.state==='closed'&&report.latest?`Fechado por ${report.latest.actor_snapshot.name} em ${moment(report.latest.closed_at)}. Versão ${report.latest.revision}.`:`${report.live.count} recebimento(s) · ${money(report.live.totals.total)} em entradas · ${report.live.reversedCount} recebimento(s) estornado(s) desconsiderado(s).`}</p></div>
    {!readOnly&&(report.state==='closed'?report.canReopen&&report.latest&&<button type="button" className="button" onClick={()=>setShowReopen(true)}><RotateCcw size={16}/>Reabrir caixa</button>:date<=today&&<button type="button" className="button button-primary" onClick={()=>setShowClose(true)}><LockKeyhole size={16}/>Fechar caixa do dia</button>)}
   </div>
   {!readOnly&&<p className="text-xs text-[var(--text-muted)]">{report.state==='closed'?'Novas baixas, alterações financeiras e estornos que afetem este dia estão bloqueados. Administrador ou secretaria pode reabrir com justificativa.':'Ao fechar, os valores conferidos, diferenças, recebimentos e responsável ficam preservados. Datas futuras não podem ser fechadas.'}</p>}
   {report.history.length>0&&<div className="space-y-3 border-t border-[var(--border-color)] pt-4"><h3 className="font-semibold text-sm flex items-center gap-2"><History size={16}/>Histórico de fechamentos e reaberturas</h3>{report.history.map(closure=><CashHistoryEntry key={closure.id} closure={closure}/>)}</div>}
   {readOnly&&report.history.length===0&&<p className="text-sm text-[var(--text-muted)]">Nenhum fechamento registrado nesta data.</p>}
  </>}
  {showClose&&report&&<CashCloseDialog source={report.live} initialOpening={report.latest?.opening_cash||0} onClose={()=>setShowClose(false)} onSuccess={()=>completed('Fechamento registrado. Consulte abaixo o estado atualizado e o documento preservado.')} onReload={()=>{setShowClose(false);refresh()}}/>}
  {showReopen&&report?.latest&&<ReopenDialog closure={report.latest} onClose={()=>setShowReopen(false)} onSuccess={()=>completed('Reabertura registrada com justificativa. O fechamento anterior permanece no histórico.')}/>}
 </section>
}

export function CashDayAudit(){
 const [expanded,setExpanded]=useState(false),[date,setDate]=useState(()=>getBrDateStr())
 return <section className="surface p-4 space-y-4"><button type="button" className="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}><History size={16}/>Fechamentos e reaberturas de caixa</button>{expanded&&<><div><label className="field-label" htmlFor="cash-audit-date">Dia do caixa</label><input id="cash-audit-date" type="date" min="2000-01-01" value={date} onChange={event=>{if(event.target.value)setDate(event.target.value)}} className="input-escolinha max-w-xs"/></div><CashDayClosurePanel key={date} date={date} today={getBrDateStr()} readOnly/></>}</section>
}
