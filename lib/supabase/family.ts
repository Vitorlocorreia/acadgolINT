import 'server-only'
import { publicSupabaseConfig } from './config'
export async function familyAccess(action:'portal'|'callup'|'confirm',token:string) {
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))return null
 const {url,key}=publicSupabaseConfig()
 const response=await fetch(`${url}/functions/v1/family-access`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({action,token}),cache:'no-store',signal:AbortSignal.timeout(20000)})
 const result=await response.json()
 if(!response.ok)throw new Error(result.error||'Não foi possível carregar este acesso.')
 return result.data
}
