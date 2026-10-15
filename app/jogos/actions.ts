'use server'
import {familyAccess} from '@/lib/supabase/family'
import {createAdminClient} from '@/lib/supabase/admin'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {sendEvolutionWhatsAppMedia} from '@/lib/whatsapp/evolution'
import {callupCardModel,buildCallupCaption} from '@/lib/callups/model'
import {renderCallupCard} from '@/lib/callups/card'
import {sendTrackedWhatsApp} from '@/lib/whatsapp/tracked'
import type {SupabaseClient} from '@supabase/supabase-js'

export async function getMatchesList() {
 const db=await createAdminClient('games.read'); const {data,error}=await db.rpc('staff_matches');
 if(error)throw new Error('Não foi possível carregar as partidas.');return data||[]
}

export async function getFormDataForMatches() {
  const supabase = await createAdminClient('games.read')

  const [unitsRes, categoriesRes, coachesRes, studentsRes] = await Promise.all([
    supabase.from('units').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('min_age'),
    supabase.from('coaches').select('*').eq('is_active', true).order('name'),
    supabase.rpc('staff_student_roster'),
  ])

  if ([unitsRes, categoriesRes, coachesRes, studentsRes].some(result => result.error)) {
    throw new Error('Não foi possível carregar as opções da partida. Tente novamente.')
  }
  return {
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    coaches: coachesRes.data ?? [],
    students: studentsRes.data ?? [],
  }
}

function callupGuardians(callup:any){
 const student=Array.isArray(callup.student)?callup.student[0]:callup.student;
 const list=Array.isArray(student?.guardian)?student.guardian:student?.guardian?[student.guardian]:[];
 return list.filter((g:any)=>g?.phone&&g.receives_notifications!==false);
}
async function sendCallupImage(db:SupabaseClient,callup:any,guardians:any[]){
 const model=callupCardModel(callup);
 const image=await renderCallupCard(model,{requirePhoto:true});
 const media=Buffer.from(await image.arrayBuffer()).toString('base64');
 let sent=0,skipped=0;
 for(const guardian of guardians){
  const caption=buildCallupCaption(callup,guardian.name,true);
  const result=await sendTrackedWhatsApp(db,{kind:'callup',entityId:callup.id,guardianId:guardian.id,message:caption},phone=>sendEvolutionWhatsAppMedia({phone,media,mimetype:'image/png',fileName:'convocacao_'+model.studentName.replace(/[^\p{L}\p{N}]+/gu,'_')+'.png',caption,fallbackToText:false}));
  if(result.status==='accepted')sent++;
  if(result.status==='already_accepted')skipped++;
 }
 return {sent,skipped};
}
export async function dispatchMatchCallupsWhatsAppAction(matchId:string):Promise<{success:boolean;sentCount:number;skippedCount?:number;totalGuardians:number;error?:string}>{
 const db=await createAdminClient('games.write'),result=await db.rpc('staff_matches');
 const match=(result.data||[]).find((item:any)=>item.id===matchId);
 if(result.error||!match)return {success:false,sentCount:0,totalGuardians:0,error:'Partida não encontrada.'};
 const callups=(match.callups||[]).map((callup:any)=>({...callup,match}));
 const totalGuardians=callups.reduce((count:number,callup:any)=>count+callupGuardians(callup).length,0);
 const withoutPhoto=callups.filter((callup:any)=>callupGuardians(callup).length&&!callupCardModel(callup).photoUrl);
 if(withoutPhoto.length)return {success:false,sentCount:0,totalGuardians,error:'Complete a foto de '+withoutPhoto.length+' atleta(s) antes do envio em lote.'};
 let sentCount=0,skippedCount=0,index=0,missingPhoto=false;
 async function worker(){
  while(index<callups.length){
   const callup=callups[index++],guardians=callupGuardians(callup);if(!guardians.length)continue;
   try{const result=await sendCallupImage(db,callup,guardians);sentCount+=result.sent;skippedCount+=result.skipped}catch{missingPhoto=true}
  }
 }
 await Promise.all([worker(),worker()]);
 revalidatePath('/jogos');
 const success=totalGuardians>0&&sentCount+skippedCount===totalGuardians;
 return {success,sentCount,skippedCount,totalGuardians,error:success?undefined:totalGuardians===0?'Nenhum responsável habilitado para receber.':sentCount+' imagens aceitas; '+skippedCount+' já enviadas. '+(missingPhoto?'Confira as fotos dos atletas.':'Confira as falhas e autorize novas tentativas no histórico da Comunicação.')};
}
export async function dispatchSingleCallupWhatsAppAction(callupId:string):Promise<{success:boolean;message:string}>{
 const db=await createAdminClient('games.write'),result=await db.rpc('staff_callup',{p_callup:callupId});
 if(result.error||!result.data)return {success:false,message:'Convocação não encontrada.'};
 const guardians=callupGuardians(result.data);
 if(!guardians.length)return {success:false,message:'Nenhum responsável com telefone e notificações habilitadas.'};
 try {
  const delivery=await sendCallupImage(db,result.data,guardians);
  revalidatePath('/jogos');
  return {success:delivery.sent+delivery.skipped===guardians.length,message:delivery.sent+' imagens aceitas pelo serviço; '+delivery.skipped+' já enviadas. '+(delivery.sent+delivery.skipped===guardians.length?'Nenhuma mensagem repetida.':'Confira os pendentes no histórico da Comunicação.')};
 }catch(err){return {success:false,message:err instanceof Error?err.message:'Não foi possível gerar a imagem da convocação.'}}
}

export async function createMatchAction(formData: FormData): Promise<void> {
  const supabase = await createAdminClient('games.write')

  const payload=Object.fromEntries(formData.entries());
  const {error}=await supabase.rpc('save_match',{p_match:null,p_payload:payload,p_students:formData.getAll('selected_students').map(String)});
  if(error)throw new Error(error.message);revalidatePath('/jogos');redirect('/jogos');
}
export async function updateMatchAndCallupsAction(formData:FormData){
 const supabase=await createAdminClient('games.write');
 const {error}=await supabase.rpc('save_match',{p_match:String(formData.get('match_id')),p_payload:Object.fromEntries(formData.entries()),p_students:formData.getAll('selected_students').map(String)});
 if(error)throw new Error(error.message);revalidatePath('/jogos');return {success:true};
}


export async function updateMatchScoreAction(
  matchId: string,
  ourScore: number,
  opponentScore: number,
  status: string = 'finished'
) {
  const supabase = await createAdminClient('games.write')

  const { error } = await supabase
    .from('matches')
    .update({
      our_score: ourScore,
      opponent_score: opponentScore,
      status,
    })
    .eq('id', matchId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/jogos')
  return { success: true }
}

export async function updateCallupStatsAction(
  callupId: string,
  goals: number,
  assists: number,
  status: string
) {
  const supabase = await createAdminClient('games.write')

  const { error } = await supabase
    .from('match_callups')
    .update({
      goals,
      assists,
      status,
    })
    .eq('id', callupId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/jogos')
  return { success: true }
}

export async function getCallupDetails(token:string){return familyAccess('callup',token)}
export async function confirmCallupAction(token:string){
 try {const result=await familyAccess('confirm',token); if(!result)return {success:false,error:'Link inválido ou expirado.'};revalidatePath('/jogos');revalidatePath('/convocacao/'+token);return {success:true}}
 catch{return {success:false,error:'Não foi possível confirmar. Revise o link e tente novamente.'}}
}
