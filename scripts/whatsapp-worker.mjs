import {createClient} from '@supabase/supabase-js'
import {pathToFileURL} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'

// No message bodies, destinations, credentials or raw provider errors are written to logs.
export async function deliverText(config,job,fetcher=fetch){
 let number=String(job.phone||'').replace(/\D/g,'')
 if([10,11].includes(number.length))number='55'+number
 if(!/^\d{12,15}$/.test(number))return {result:'failed',error:'Telefone do responsável inválido.'}
 try{
  const response=await fetcher(config.url+'/message/sendText/'+encodeURIComponent(config.instance),{method:'POST',headers:{'Content-Type':'application/json',apikey:config.key},body:JSON.stringify({number,text:job.message,options:{delay:1200,presence:'composing'}}),redirect:'error',signal:AbortSignal.timeout(15000)})
  const body=await response.json().catch(()=>null)
  if(response.ok&&!body?.error&&body?.key?.id)return {result:'accepted',providerId:String(body.key.id)}
  const uncertain=response.status>=500||response.ok
  return {result:uncertain?'uncertain':'failed',error:uncertain?'O serviço não confirmou o envio. Confira a conversa antes de reenviar.':'Serviço recusou o envio (HTTP '+response.status+'). Confira a conexão e o número.'}
 }catch{return {result:'uncertain',error:'Conexão interrompida durante o envio. Confira a conversa antes de reenviar.'}}
}

export async function runWorker(env=process.env){
 const config={url:env.EVOLUTION_API_URL?.trim().replace(/\/+$/,''),key:env.EVOLUTION_API_KEY?.trim(),instance:env.EVOLUTION_INSTANCE_NAME?.trim()}
 const publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!env.NEXT_PUBLIC_SUPABASE_URL||!publicKey||!env.WHATSAPP_WORKER_TOKEN||!config.url||!config.key||!config.instance)throw new Error('Configuração privada da rotina incompleta.')
 const url=new URL(config.url)
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Endereço do WhatsApp inválido.')
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,publicKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const rpc=async(operation,payload={})=>{
  const result=await db.rpc('whatsapp_worker',{p_token:env.WHATSAPP_WORKER_TOKEN,p_operation:operation,p_payload:payload})
  if(result.error)throw new Error('A rotina não conseguiu registrar a operação no banco de dados.')
  return result.data
 }
 let stopping=false
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true})
 console.info('Rotina de comunicação iniciada. Preferências e horários serão consultados no banco.')
 while(!stopping){
  try{
   const job=await rpc('claim')
   if(job){
    const outcome=await deliverText(config,job)
    const saved=await rpc('finish',{id:job.id,claim:job.claim,...outcome})
    if(!saved)throw new Error('Resultado sem confirmação no banco. Não repetir automaticamente.')
    console.info('Resultado de envio registrado: '+outcome.result)
   }else await pause(15000)
  }catch{console.error('Rotina aguardando recuperação da conexão. Consulte Comunicação para revisar pendências.');await pause(30000)}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runWorker().catch(()=>{console.error('Não foi possível iniciar a rotina. Confira a configuração privada.');process.exitCode=1})
