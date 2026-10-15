const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const ids={studentId:'d76e3f23-9c3d-4c21-806b-3fcbde8cf2c3',enrollmentId:'69287b56-79d7-4f97-9561-3a066e13bbd8',classId:'f533224c-77c3-4bba-8249-7b9585f5b873',planId:'',monthlyFee:150,dueDay:31};
function run({denied=false,mismatch=false}={}){
 const writes=[];const action=loadTS('app/alunos/import-actions.ts',{
  zod:require('zod'),'next/cache':{revalidatePath:()=>{}},
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'students.write');if(denied)throw Error('Denied');return {
   from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{student_id:mismatch?ids.classId:ids.studentId},error:null})};return q},
   rpc:async(name,args)=>{writes.push({name,args});return {error:null}},
  }}},
 });return {action,writes};
}
test('linking imported students checks permission and invoice ownership at the server boundary',async()=>{
 const denied=run({denied:true});await assert.rejects(()=>denied.action.completeImportedEnrollmentAction(ids),/Denied/);assert.equal(denied.writes.length,0);
 const mismatch=run({mismatch:true});assert.ok((await mismatch.action.completeImportedEnrollmentAction(ids)).error);assert.equal(mismatch.writes.length,0);
});
test('class assignment keeps the imported fee, supports day 31 and never forwards payment or status changes',async()=>{
 const instance=run();assert.equal((await instance.action.completeImportedEnrollmentAction({...ids,status:'paid',settled_before_import:true})).success,true);
 const call=instance.writes[0];assert.equal(call.name,'complete_imported_enrollment');assert.equal(call.args.p_plan,null);assert.equal(call.args.p_fee,150);assert.equal(call.args.p_due_day,31);assert.equal(Object.keys(call.args).length,5);
});
test('invalid dates, negative fees and fractional cents cannot change imported agreements',async()=>{
 for(const change of [{dueDay:0},{dueDay:32},{dueDay:2.5},{monthlyFee:-1},{monthlyFee:100.001},{classId:''}]){
  const instance=run();assert.ok((await instance.action.completeImportedEnrollmentAction({...ids,...change})).error);assert.equal(instance.writes.length,0);
 }
});
