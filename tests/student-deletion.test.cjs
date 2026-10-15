const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs')
const studentId='d76e3f23-9c3d-4c21-806b-3fcbde8cf2c3'
function scenario(denied=false){
 const calls=[],permissions=[],paths=[]
 const action=loadTS('app/alunos/deletion-actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{permissions.push(permission);if(denied)throw Error('Denied');return {rpc:async(name,args)=>{calls.push({name,args});return {error:null}}}}},
  zod:require('zod'),'next/cache':{revalidatePath:path=>paths.push(path)},
 })
 return {action,calls,permissions,paths}
}
test('deletion requires student-write permission, a real identity and a reason before any database operation',async()=>{
 const blocked=scenario(true);await assert.rejects(()=>blocked.action.changeStudentDeletionAction({studentId,deleted:true,reason:'Duplicado',deletedAt:null}),/Denied/);assert.equal(blocked.calls.length,0)
 for(const change of [{studentId:'bad'},{reason:''},{reason:'    '},{deleted:null},{reason:'x'.repeat(501)}]){
  const run=scenario();assert.ok((await run.action.changeStudentDeletionAction({studentId,deleted:true,reason:'Duplicado',deletedAt:null,...change})).error);assert.equal(run.calls.length,0);assert.equal(run.permissions[0],'students.write')
 }
})
test('deletion forwards only the verified target and reason, without allowing payment/status/actor forgery',async()=>{
 const run=scenario();assert.equal((await run.action.changeStudentDeletionAction({studentId,deleted:true,reason:'  Cadastro duplicado  ',deletedAt:null,actor_id:'forged',status:'paid',invoices:[]})).success,true)
 const call=run.calls[0];assert.equal(call.name,'change_student_deletion');assert.equal(call.args.p_reason,'Cadastro duplicado');assert.equal(call.args.p_student,studentId);assert.equal(call.args.p_deleted,true);assert.equal(Object.keys(call.args).length,4)
 assert.ok(run.paths.includes('/alunos'));assert.ok(run.paths.includes('/financeiro'));assert.ok(run.paths.includes('/chamada'))
})
test('restoring requires the exact deletion timestamp to prevent a stale window restoring a later exclusion',async()=>{
 const run=scenario();assert.ok((await run.action.changeStudentDeletionAction({studentId,deleted:false,reason:'',deletedAt:null})).error);assert.equal(run.calls.length,0)
 const deletedAt='2026-10-15T20:00:00.123456+00:00';assert.equal((await run.action.changeStudentDeletionAction({studentId,deleted:false,reason:'',deletedAt})).success,true);assert.equal(run.calls[0].args.p_expected_deleted_at,deletedAt)
})
