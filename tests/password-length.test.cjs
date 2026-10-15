const test=require('node:test'),assert=require('node:assert/strict');
const {loadTS}=require('./support/load-ts.cjs');
function scenario(){
 const changes=[];let completed=0;
 const actions=loadTS('app/alterar-senha/actions.ts',{
  zod:require('zod'),'next/navigation':{redirect:path=>{throw Error('redirect:'+path)}},
  '@/lib/auth/permissions':{homeForRole:()=>'/dashboard'},
  '@/lib/auth/session':{requireStaff:async()=>({staff:{role:'admin',must_change_password:true},db:{auth:{updateUser:async value=>{changes.push(value);return {error:null}}},rpc:async()=>{completed++;return {data:true,error:null}}}})},
 });return {actions,changes,completed:()=>completed};
}
function form(password,confirm=password){const f=new FormData();f.set('password',password);f.set('confirm',confirm);return f}
test('a seven-character password is rejected before changing credentials',async()=>{
 const run=scenario();const result=await run.actions.changePasswordAction({error:''},form('Abc1234'));assert.match(result.error,/8 caracteres/);assert.equal(run.changes.length,0);
});
test('eight-character passwords are accepted and mandatory change is completed',async()=>{
 const run=scenario();await assert.rejects(run.actions.changePasswordAction({error:''},form('Teste123')),/redirect:\/dashboard/);assert.equal(run.changes.length,1);assert.equal(run.completed(),1);
});
test('password confirmation and composition still apply at eight characters',async()=>{
 for(const input of [form('Teste123','Outro123'),form('12345678'),form('abcdefgh')]){const run=scenario();assert((await run.actions.changePasswordAction({error:''},input)).error);assert.equal(run.changes.length,0)}
});
