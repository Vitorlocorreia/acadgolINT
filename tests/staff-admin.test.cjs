const test=require('node:test'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {loadTS}=require('./support/load-ts.cjs');
const actorId='d7b3e911-f07e-4f40-83b8-d36e5d1d6229',targetId='f9b2bc19-0dd2-47eb-aef8-2fb6def89e04';
function scenario({actorRole='secretaria',targetRole='treinador',lostWrite=false,mutationError=null,self=false}={}){
 let handler;const writes=[],logins=[];const target={id:self?actorId:targetId,role:targetRole,email:'coach@example.invalid',username:'coach',active:true};
 const admin={auth:{getUser:async()=>({data:{user:{id:actorId}}}),admin:{getUserById:async()=>({data:{user:{id:target.id,email:'technical@accounts.acadgol.invalid'}}}),createUser:async data=>{writes.push(['auth-create',data]);return {data:{user:{id:targetId}}}},deleteUser:async()=>({error:null}),updateUserById:async(id,data)=>{writes.push(['auth-update',id,data]);return {error:null}}}},
  from:table=>{let mutation=false,patch;const filters={};const q={select:()=>q,eq:(key,value)=>{filters[key]=value;return q},or:()=>q,maybeSingle:async()=>{
   if(mutation&&mutationError)return {data:null,error:{code:mutationError}};
   if((mutation&&lostWrite)||Object.entries(filters).some(([key,value])=>target[key]!==value))return {data:null,error:null};
   if(mutation)Object.assign(target,patch);
   return {data:{...target},error:null};
  },insert:async data=>{writes.push(['insert',table,data]);return {error:null}},update:data=>{mutation=true;patch=data;writes.push(['update',table,data]);return q},then:(resolve,reject)=>Promise.resolve({error:null}).then(resolve,reject)};return q},rpc:async(name,args)=>{writes.push(['rpc',name,args]);return {data:targetId,error:null}}};
 const viewer={auth:{signInWithPassword:async data=>{logins.push(data);return {data:{session:{access_token:'fixture-access',refresh_token:'fixture-refresh'}},error:null}}},rpc:async()=>({data:{id:actorId,role:actorRole,active:true,session_valid:true,must_change_password:false},error:null})};
 let clients=0;loadTS('supabase/functions/staff-admin/index.ts',{'npm:@supabase/supabase-js@2.117.3':{createClient:()=>clients++===0?admin:viewer}},{Deno:{env:{get:()=> 'fixture'},serve:fn=>{handler=fn}},Request,Response,crypto:webcrypto,TextEncoder});
 return {writes,logins,run:async body=>{const response=await handler(new Request('https://example.invalid/staff-admin',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}}};
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

test('editing login aliases preserves the identity/password and only the new aliases log in',async()=>{
 const run=scenario();
 const edited=await run.run({action:'update',user_id:targetId,username:'  NOVO.TREINADOR  ',email:'  NOVO@EXAMPLE.INVALID  ',role:'treinador',active:true,coach_id:actorId});
 assert.equal(edited.status,200);
 for(const identifier of ['novo.treinador','novo@example.invalid']){
  const login=await run.run({action:'login',identifier,password:'Existing1'});
  assert.equal(login.status,200);
  assert.equal(run.logins.at(-1).email,'technical@accounts.acadgol.invalid');assert.equal(run.logins.at(-1).password,'Existing1');
 }
 for(const identifier of ['coach','coach@example.invalid'])assert.equal((await run.run({action:'login',identifier,password:'Existing1'})).status,401);
 assert.equal(run.writes.filter(x=>x[0]==='auth-update'||x[0]==='auth-create').length,0);
 const patch=run.writes.find(x=>x[0]==='update')[2];
 assert.equal(patch.username,'novo.treinador');assert.equal(patch.email,'novo@example.invalid');assert.equal(patch.updated_by,actorId);assert(patch.sessions_valid_after);
});

test('duplicate login aliases fail without changing the existing login or password',async()=>{
 const run=scenario({mutationError:'23505'});
 const edited=await run.run({action:'update',user_id:targetId,username:'already.used',email:'used@example.invalid',role:'treinador',active:true,coach_id:actorId});
 assert.equal(edited.status,409);assert.match(edited.body.error,/já está em uso/);
 assert.equal((await run.run({action:'login',identifier:'coach',password:'Existing1'})).status,200);
 assert.equal((await run.run({action:'login',identifier:'already.used',password:'Existing1'})).status,401);
 assert.equal(run.writes.filter(x=>x[0]==='auth-update').length,0);
});

test('an administrator may edit their own aliases but cannot demote or block themselves',async()=>{
 const run=scenario({actorRole:'admin',targetRole:'admin',self:true});
 const base={action:'update',user_id:actorId,username:'admin.novo',email:'admin@example.invalid',role:'admin',active:true};
 assert.equal((await run.run({...base,role:'secretaria'})).status,400);
 assert.equal((await run.run({...base,active:false})).status,400);
 assert.equal(run.writes.length,0);
 const edited=await run.run(base);assert.equal(edited.status,200);assert.equal(edited.body.selfUpdated,true);
});

test('secretaries cannot edit another role login identifiers',async()=>{
 const run=scenario({targetRole:'admin'});
 assert.equal((await run.run({action:'update',user_id:targetId,username:'changed',email:'changed@example.invalid',role:'treinador',active:true,coach_id:actorId})).status,403);
 assert.equal(run.writes.length,0);
});

test('removing the optional email keeps the username login available',async()=>{
 const run=scenario();
 assert.equal((await run.run({action:'update',user_id:targetId,username:'novo',email:'',role:'treinador',active:true,coach_id:actorId})).status,200);
 assert.equal(run.writes.find(x=>x[0]==='update')[2].email,'novo@accounts.acadgol.invalid');
 assert.equal((await run.run({action:'login',identifier:'novo',password:'Existing1'})).status,200);
 assert.equal((await run.run({action:'login',identifier:'coach@example.invalid',password:'Existing1'})).status,401);
});

test('invalid identifiers and concurrent changes do not report a successful update',async()=>{
 for(const fields of [{username:'ab'},{username:'bad user'},{email:'not-an-email'},{email:null}]){
  const run=scenario();assert.equal((await run.run({action:'update',user_id:targetId,role:'treinador',active:true,coach_id:actorId,...fields})).status,400);assert.equal(run.writes.length,0);
 }
 const concurrent=scenario({lostWrite:true});assert.equal((await concurrent.run({action:'update',user_id:targetId,username:'novo',email:'novo@example.invalid',role:'treinador',active:true,coach_id:actorId})).status,409);
});
