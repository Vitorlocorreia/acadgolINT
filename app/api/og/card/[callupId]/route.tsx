import {familyAccess} from '@/lib/supabase/family'
import {callupCardModel} from '@/lib/callups/model'
import {renderCallupCard} from '@/lib/callups/card'
export const runtime='nodejs'
export async function GET(_request:Request,{params}:{params:Promise<{callupId:string}>}){
 try {
  const {callupId}=await params,detail=await familyAccess('callup',callupId)
  if(!detail?.callup)return new Response('Acesso indisponível',{status:404,headers:{'Cache-Control':'no-store'}})
  return await renderCallupCard(callupCardModel(detail.callup))
 }catch{return new Response('Não foi possível gerar a convocação.',{status:500,headers:{'Cache-Control':'no-store'}})}
}
