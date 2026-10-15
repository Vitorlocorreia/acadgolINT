import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const one=(v:any)=>Array.isArray(v)?v[0]??null:v??null;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
 try {
  const raw=await req.text();if(raw.length>1000)return reply({error:'Solicitação inválida.'},400);
  const {action,token}=JSON.parse(raw);
  if(typeof token!=='string'||!uuid.test(token)||!['portal','callup','confirm'].includes(action))return reply({error:'Link inválido.'},400);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const limit=await db.rpc('consume_request_limit',{p_bucket:`family:${hash}`,p_limit:300,p_seconds:300});
  if(limit.error||!limit.data)return reply({error:'Aguarde alguns minutos e tente novamente.'},429);
  if(action==='portal'){
   const student=await db.from('students').select('id,name,birth_date,status,photo_url,preferred_position,dominant_foot,uniform_size,enrollment:enrollments(id,status,plan:plans(name),class:classes(name,days_of_week,start_time,end_time,unit:units(name),coach:coaches(name))),invoices:invoices(id,reference_month,due_date,amount,paid_amount,status,paid_at,charge_type)').eq('portal_token',token).eq('portal_access_enabled',true).gt('portal_token_expires_at',new Date().toISOString()).maybeSingle();
   if(student.error)throw student.error;if(!student.data)return reply({data:null});
   const id=student.data.id;
   const [attendance,evaluation,callups]=await Promise.all([
    db.from('attendance_logs').select('id,training_date,status').eq('student_id',id).order('training_date',{ascending:false}).limit(10),
    db.from('technical_evaluations').select('evaluation_date,score_pass,score_shooting,score_dribble,score_control,score_marking,score_speed,score_stamina,score_discipline,score_teamwork,strengths,areas_to_improve,coach_feedback,coach:coaches(name)').eq('student_id',id).order('evaluation_date',{ascending:false}).limit(1),
    db.from('match_callups').select('id,access_token,status,goals,assists,match:matches(id,title,opponent,match_date,match_time,location,status,our_score,opponent_score)').eq('student_id',id).eq('access_enabled',true).gt('access_expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(20)
   ]);
   if(attendance.error||evaluation.error||callups.error)throw new Error('Falha na consulta.');
   return reply({data:{student:{...student.data,enrollment:student.data.enrollment.map((e:any)=>{const c=one(e.class);return {...e,plan:one(e.plan),class:c?{...c,unit:one(c.unit),coach:one(c.coach)}:null}})},attendance:attendance.data||[],evaluation:one(evaluation.data),callups:(callups.data||[]).map(c=>({...c,match:one(c.match)})),asOf:new Date().toISOString(),errors:[]}});
  }
  const callup=await db.from('match_callups').select('id,access_token,status,goals,assists,access_expires_at,match:matches(id,title,opponent,match_date,match_time,match_type,location,status,our_score,opponent_score,notes,unit:units(name),category:categories(name),coach:coaches(name)),student:students(id,name,birth_date,photo_url,preferred_position,dominant_foot)').eq('access_token',token).eq('access_enabled',true).gt('access_expires_at',new Date().toISOString()).maybeSingle();
  if(callup.error)throw callup.error;if(!callup.data)return reply({data:null});
  const match=one(callup.data.match),student=one(callup.data.student);
  if(action==='confirm'){
   if(match?.status!=='scheduled')return reply({error:'A confirmação desta partida está encerrada.'},409);
   const changed=await db.from('match_callups').update({status:'confirmed'}).eq('id',callup.data.id).in('status',['pending','confirmed']);
   if(changed.error)throw changed.error;return reply({data:{success:true}});
  }
  return reply({data:{callup:{...callup.data,match,student},evaluation:null}});
 }catch{return reply({error:'Não foi possível carregar este acesso. Tente novamente.'},500)}
});
