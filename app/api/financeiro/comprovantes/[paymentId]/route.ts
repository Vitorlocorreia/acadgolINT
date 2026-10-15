import {getStaffSession} from '@/lib/auth/session'
import {hasPermission} from '@/lib/auth/permissions'
import {PAYMENT_PROOF_BUCKET,PAYMENT_PROOF_TYPES,paymentProofExtension,type PaymentProofType} from '@/lib/finance/payment-proof'
import {z} from 'zod'
const failure=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(_request:Request,{params}:{params:Promise<{paymentId:string}>}){
 const session=await getStaffSession()
 if(!session?.staff.active||!session.staff.session_valid||session.staff.must_change_password)return failure('Entre novamente para consultar o comprovante.',401)
 if(!hasPermission(session.staff.role,'finance.read'))return failure('Seu perfil não pode consultar comprovantes financeiros.',403)
 const {paymentId}=await params
 if(!z.uuid().safeParse(paymentId).success)return failure('Comprovante não encontrado.',404)
 const result=await session.db.from('invoice_payments').select('proof_path,proof_name,proof_mime').eq('id',paymentId).maybeSingle()
 if(result.error)return failure('Não foi possível consultar o comprovante.',503)
 const proof=result.data
 if(!proof?.proof_path||!(PAYMENT_PROOF_TYPES as readonly string[]).includes(proof.proof_mime))return failure('Comprovante não encontrado.',404)
 const file=await session.db.storage.from(PAYMENT_PROOF_BUCKET).download(proof.proof_path)
 if(file.error||!file.data)return failure('Não foi possível baixar o comprovante. Tente novamente.',503)
 const name=encodeURIComponent(proof.proof_name||'comprovante').replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())
 return new Response(file.data,{headers:{'Content-Type':proof.proof_mime,'Content-Disposition':`attachment; filename="comprovante.${paymentProofExtension(proof.proof_mime as PaymentProofType)}"; filename*=UTF-8''${name}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
