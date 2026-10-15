'use client'
import {useState} from 'react'
import {Paperclip,Download,Loader2} from 'lucide-react'
import {Dialog} from '@/components/dialog'
import {getInvoiceProofsAction} from './actions'
type Proof=Awaited<ReturnType<typeof getInvoiceProofsAction>>['proofs'][number]
export function InvoiceProofsButton({invoiceId,count}:{invoiceId:string;count:number}){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[proofs,setProofs]=useState<Proof[]>([]),[error,setError]=useState('')
 if(!count)return null
 async function show(){setOpen(true);setLoading(true);setError('');setProofs([]);try{const result=await getInvoiceProofsAction(invoiceId);setProofs(result.proofs);setError(result.error)}catch{setError('Não foi possível carregar os comprovantes. Tente novamente.')}finally{setLoading(false)}}
 return <><button type="button" className="button text-xs" aria-label="Consultar comprovantes desta cobrança" onClick={show}><Paperclip size={15}/>Comprovantes ({count})</button><Dialog open={open} onClose={()=>setOpen(false)} title="Comprovantes da cobrança" description="Os anexos ficam vinculados ao recebimento, inclusive quando ele é estornado.">{loading?<p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin"/>Carregando comprovantes…</p>:error?<p role="alert" className="notice notice-error">{error}</p>:<ul className="space-y-4">{proofs.map(proof=><li key={proof.id} className="rounded-xl border border-[var(--border-color)] p-4 space-y-3"><div><p className="font-semibold break-all text-sm">{proof.proof_name}</p><p className="text-xs text-[var(--text-muted)] mt-1">{new Date(proof.paid_at).toLocaleString('pt-BR',{timeZone:'America/Recife'})} · {Number(proof.received_amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · {(Number(proof.proof_size)/1024).toFixed(0)} KB</p>{proof.reversal&&<p className="text-xs text-amber-700 mt-2">Recebimento estornado: {proof.reversal.reason}</p>}</div><a href={`/api/financeiro/comprovantes/${proof.id}`} className="button" target="_blank" rel="noreferrer"><Download size={15}/>Baixar comprovante</a></li>)}</ul>}</Dialog></>
}
