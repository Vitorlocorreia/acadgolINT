const test=require('node:test'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {loadTS}=require('./support/load-ts.cjs');
const actorId='d7b3e911-f07e-4f40-83b8-d36e5d1d6229',targetId='f9b2bc19-0dd2-47eb-aef8-2fb6def89e04';
function scenario({actorRole='secretaria',targetRole='treinador',lostWrite=false}={}){
 let handler;const writes=[];const target={id:targetId,role:targetRole,email:'coach@example.invalid',username:'coach',active:true};
 const admin={auth:{getUser:async()=>({data:{user:{id:actorId}}}),admin:{createUser:async data=>{writes.push(['auth-create',data]);return {data:{user:{id:targetId}}}},deleteUser:async()=>({error:null}),updateUserById:async(id,data)=>{writes.push(['auth-update',id,data]);return {error:null}}}},
  from:table=>{let mutation=false;const q={select:()=>q,eq:()=>q,or:()=>q,maybeSingle:async()=>({data:lostWrite&&mutation?null:target,error:null}),insert:async data=>{writes.push(['insert',table,data]);return {error:null}},update:data=>{mutation=true;writes.push(['update',table,data]);return q},then:(resolve,reject)=>Promise.resolve({error:null}).then(resolve,reject)};return q},rpc:async(name,args)=>{writes.push(['rpc',name,args]);return {data:targetId,error:null}}};
 const viewer={rpc:async()=>({data:{id:actorId,role:actorRole,active:true,session_valid:true,must_change_password:false},error:null})};
 let clients=0;loadTS('supabase/functions/staff-admin/index.ts',{'npm:@supabase/supabase-js@2.117.3':{createClient:()=>clients++===0?admin:viewer}},{Deno:{env:{get:()=> 'fixture'},serve:fn=>{handler=fn}},Request,Response,crypto:webcrypto,TextEncoder});
 return {writes,run:async body=>{const response=await handler(new Request('https://example.invalid/staff-admin',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}}};
}
test('secretary cannot create an administrator or another office role through the Edge API',async()=>{
 for(const role of ['admin','secretaria','financeiro']){const run=scenario();const response=await run.run({action:'create',role});assert.equal(response.status,403);assert.equal(run.writes.length,0)}
});
test('secretary can create a trainer and a new coach registration together',async()=>{
 const run=scenario();const response=await run.run({action:'create',username:'novo.treinador',email:'novo@sport.com',full_name:'Treinador de verificação',role:'treinador',create_coach:true});
 assert.equal(response.status,200);assert.equal(response.body.mustChangePassword,true);
 assert.equal(response.body.temporaryPassword.length,8);
 for(const pattern of [/[A-Z]/,/[a-z]/,/[0-9]/,/[!@#$%]/])assert.match(response.body.temporaryPassword,pattern);
 assert.equal(run.writes[0][0],'auth-create');assert.equal(run.writes[1][0],'rpc');assert.equal(run.writes[1][1],'create_coach_access_profile');assert.equal(run.writes[1][2].p_staff.created_by,actorId);assert.equal(run.writes[1][2].p_staff.role,'treinador');
});
test('secretary cannot promote a trainer or reset an administrator password',async()=>{
 const promote=scenario();assert.equal((await promote.run({action:'update',user_id:targetId,role:'admin',active:true})).status,403);assert.equal(promote.writes.length,0);
 const reset=scenario({targetRole:'admin'});assert.equal((await reset.run({action:'reset_password',user_id:targetId})).status,403);assert.equal(reset.writes.length,0);
});
test('secretary can block a trainer and revoke previous sessions',async()=>{
 const run=scenario();const response=await run.run({action:'update',user_id:targetId,role:'treinador',active:false,coach_id:actorId});assert.equal(response.status,200);
 const changed=run.writes.find(x=>x[0]==='update')[2];assert.equal(changed.active,false);assert.equal(changed.role,'treinador');assert.equal(changed.updated_by,actorId);assert(changed.sessions_valid_after);
});
test('secretary can reset a trainer password while preserving mandatory first-use change',async()=>{
 const run=scenario();const response=await run.run({action:'reset_password',user_id:targetId});assert.equal(response.status,200);assert.equal(response.body.mustChangePassword,true);
 assert.equal(response.body.temporaryPassword.length,8);
 assert.equal(run.writes.filter(x=>x[0]==='auth-update').length,1);const updates=run.writes.filter(x=>x[0]==='update');assert.equal(updates.length,2);assert(updates[0][2].sessions_valid_after);assert.equal(updates[1][2].must_change_password,true);
});
test('trainers cannot manage other accounts through the Edge API',async()=>{
 const run=scenario({actorRole:'treinador'});assert.equal((await run.run({action:'create',role:'treinador'})).status,403);assert.equal(run.writes.length,0);
});
test('a reset cannot change Auth credentials when the target scope or reset lock changed',async()=>{
 const run=scenario({lostWrite:true});assert.equal((await run.run({action:'reset_password',user_id:targetId})).status,409);assert.equal(run.writes.filter(x=>x[0]==='auth-update').length,0);
});
