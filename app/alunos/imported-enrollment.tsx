'use client'

import {useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {completeImportedEnrollmentAction} from './import-actions'

interface Props{
 studentId:string
 enrollment:{id:string;monthly_fee:number;due_day:number;class?:{id:string}|null;plan?:{id?:string}|null;import_source:{row:number;days?:string;shift?:string;coach?:string;review_notes?:string[];phone_sources?:string[];file_name?:string}}
 classes:{id:string;name:string}[]
 plans:{id:string;name:string}[]
}
export function ImportedEnrollment({studentId,enrollment,classes,plans}:Props){
 const [pending,start]=useTransition(),[message,setMessage]=useState(''),router=useRouter()
 const source=enrollment.import_source
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const values=new FormData(event.currentTarget);setMessage('')
  start(async()=>{try{
   const result=await completeImportedEnrollmentAction({studentId,enrollmentId:enrollment.id,classId:String(values.get('classId')||''),planId:String(values.get('planId')||''),monthlyFee:Number(values.get('monthlyFee')),dueDay:Number(values.get('dueDay'))})
   setMessage(result.error||'Vínculo atualizado. As cobranças já emitidas foram preservadas.');if(result.success)router.refresh()
  }catch{setMessage('Não foi possível salvar. Confira a conexão e tente novamente.')}})
 }
 return <section className="card-light p-5 space-y-4"><div><p className="eyebrow">Cadastro importado · linha {source.row}</p><h2 className="section-title mt-2">Conferir turma e mensalidade</h2><p className="text-sm mt-2">Na planilha: {source.days||'dias não informados'} · {source.shift||'turno não informado'} · {source.coach||'professor não informado'}.</p><p className="text-xs text-[var(--text-muted)] mt-2">Complete a foto, confira os contatos e vincule a turma real. A alteração do valor e do vencimento vale para as próximas emissões.</p></div>
  {source.review_notes?.length ? <ul className="notice notice-warning text-sm list-disc pl-7">{source.review_notes.map((note,index)=><li key={index}>{note}</li>)}</ul>:null}
  {source.phone_sources?.length ? <p className="text-xs text-[var(--text-secondary)]">Telefones na planilha, a conferir: {source.phone_sources.join(' · ')}</p>:null}
  <form onSubmit={submit} className="space-y-4"><fieldset disabled={pending} className="grid sm:grid-cols-2 gap-4">
   <div><label htmlFor="import-class" className="field-label">Turma *</label><select id="import-class" name="classId" className="input-escolinha" required defaultValue={enrollment.class?.id||''}><option value="">Selecione a turma</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><Link href="/turmas" target="_blank" rel="noopener noreferrer" className="text-link text-xs">Cadastrar turmas ↗</Link></div>
   <div><label htmlFor="import-plan" className="field-label">Plano</label><select id="import-plan" name="planId" className="input-escolinha" defaultValue={enrollment.plan?.id||''}><option value="">Manter acordo importado</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><Link href="/planos" target="_blank" rel="noopener noreferrer" className="text-link text-xs">Gerenciar planos ↗</Link></div>
   <div><label htmlFor="import-fee" className="field-label">Mensalidade acordada (R$)</label><input id="import-fee" name="monthlyFee" type="number" min="0" max="100000" step="0.01" required defaultValue={enrollment.monthly_fee} className="input-escolinha"/></div>
   <div><label htmlFor="import-due" className="field-label">Dia de vencimento</label><select id="import-due" name="dueDay" defaultValue={enrollment.due_day} className="input-escolinha">{Array.from({length:31},(_,i)=><option value={i+1} key={i}>Dia {i+1}</option>)}</select></div>
  </fieldset>{message&&<p role="status" className="notice text-sm">{message}</p>}<button className="button button-primary" disabled={pending||!classes.length}>{pending?'Salvando…':'Salvar vínculo e acordo'}</button></form>
 </section>
}
