const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
function scenario(response={data:{students:[],total:0,page:1,pages:1,pageSize:50,classes:[]},error:null},allowed=true){
 const calls=[];
 const actions=loadTS('app/alunos/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'students.read');if(!allowed)throw Error('Acesso negado');return {rpc:async(name,args)=>{calls.push({name,args});return response},from:()=>{throw Error('Full record reads are forbidden')}}}},
  'next/cache':{},'next/navigation':{}
 });return {actions,calls};
}
test('athlete class filter is combined with search, situation and server pagination',async()=>{
 const run=scenario();const classId='A0000000-0000-4000-8000-000000000001';
 const result=await run.actions.getStudentsList({search:'  Atleta  ',status:'active',page:2,classId});
 const call=run.calls[0];assert.equal(call.name,'student_directory');assert.equal(call.args.p_search,'Atleta');assert.equal(call.args.p_status,'active');assert.equal(call.args.p_page,2);assert.equal(call.args.p_class,classId.toLowerCase());assert.equal(result.classId,classId.toLowerCase());
});
test('all classes and athletes without a class are explicit and invalid filters remain bounded',async()=>{
 for(const [classId,expected] of [[undefined,'all'],['all','all'],['unassigned','unassigned'],['broken class','all']]){
  const run=scenario();const result=await run.actions.getStudentsList({classId,status:'forged',page:0,search:'x'.repeat(200)});
  assert.equal(run.calls[0].args.p_class,expected);assert.equal(result.classId,expected);assert.equal(run.calls[0].args.p_status,'all');assert.equal(run.calls[0].args.p_page,1);assert.equal(run.calls[0].args.p_search.length,120);
 }
});
test('class options are returned independently of the student result and database errors fail closed',async()=>{
 const classes=[{id:'a0000000-0000-4000-8000-000000000001',name:'Turma de teste',is_active:true}];
 const run=scenario({data:{students:[],total:0,page:1,pages:1,pageSize:50,classes},error:null});assert.equal((await run.actions.getStudentsList()).classes,classes);
 const failed=scenario({data:null,error:{message:'offline'}});await assert.rejects(failed.actions.getStudentsList({classId:classes[0].id}),/Não foi possível carregar/);
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.getStudentsList(),/Acesso negado/);assert.equal(denied.calls.length,0);
});
