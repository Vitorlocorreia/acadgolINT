export const PAYMENT_PROOF_BUCKET = 'payment-proofs'
export const MAX_PAYMENT_PROOF_BYTES = 3 * 1024 * 1024
export const PAYMENT_PROOF_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export type PaymentProofType = typeof PAYMENT_PROOF_TYPES[number]
export function paymentProofExtension(type: PaymentProofType) {
  return ({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as const)[type]
}
export function paymentProofProblem(file: {size:number;type:string}) {
  if (!file.size) return 'O arquivo está vazio. Selecione outro comprovante.'
  if (file.size > MAX_PAYMENT_PROOF_BYTES) return 'O comprovante deve ter até 3 MB.'
  if (!(PAYMENT_PROOF_TYPES as readonly string[]).includes(file.type)) return 'Use um comprovante em PDF, JPG, PNG ou WebP.'
  return null
}
export function paymentProofHasSignature(bytes: Uint8Array, type: string) {
  const text = (start:number,end:number) => String.fromCharCode(...bytes.subarray(start,end))
  if (type==='application/pdf') return text(0,5)==='%PDF-'
  if (type==='image/jpeg') return bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
  if (type==='image/png') return [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)
  if (type==='image/webp') return text(0,4)==='RIFF' && text(8,12)==='WEBP'
  return false
}
export function paymentProofName(name:string,type:PaymentProofType) {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g,'_').trim().slice(0,180) || `comprovante.${paymentProofExtension(type)}`
}
