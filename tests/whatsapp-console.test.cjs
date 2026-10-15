const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
function scenario({denied=false,data=null,error=null}={}){
 const calls=[],attendance=[];
 const actions=loadTS('app/whatsapp/actions.ts',{
  '@/lib/auth/session':{requireStaff:async permission=>{assert.equal(permission,'communications.manage');if(denied)throw Error('Denied');return {db:{rpc:async(name,args)=>{calls.push({name,args});return {data,error}}}};}},
  zod:require('zod'),'@/lib/whatsapp/evolution':{},'@/app/jogos/actions':{},
  '@/app/chamada/actions':{notifySingleStudentAttendanceAction:async(...args)=>{attendance.push(args);return {success:true,message:'Fixture accepted'}}},
 });return {actions,calls,attendance};
}
test('communication history and preferences require an authorized staff session',async()=>{
 const run=scenario({denied:true});await assert.rejects(run.actions.getWhatsAppConsoleAction(),/Denied/);await assert.rejects(run.actions.saveWhatsAppSettingsAction({}),/Denied/);assert.equal(run.calls.length,0);
});
test('unbounded history filters and invalid schedules cannot reach the database',async()=>{
 const run=scenario();await assert.rejects(run.actions.getWhatsAppConsoleAction('all',0));await assert.rejects(run.actions.getWhatsAppConsoleAction('',-1));
 assert.equal((await run.actions.saveWhatsAppSettingsAction({due_enabled:true,overdue_enabled:false,welcome_enabled:false,receipt_enabled:false,send_hour:23,days_before:3})).success,false);assert.equal(run.calls.length,0);
});
test('a failed history lookup cannot be confused with an empty history',async()=>{
 const run=scenario({error:{message:'offline'}});await assert.rejects(run.actions.getWhatsAppConsoleAction(),/registros/);
});
test('all six automation preferences are validated and do not accept a client-supplied operator',async()=>{
 const run=scenario();const result=await run.actions.saveWhatsAppSettingsAction({due_enabled:true,overdue_enabled:true,welcome_enabled:true,receipt_enabled:true,trial_confirmation_enabled:true,trial_reminder_enabled:true,send_hour:9,days_before:3,actor_id:'forged'});
 assert.equal(result.success,true);assert.equal(run.calls[0].name,'whatsapp_save_settings');assert.equal(run.calls[0].args.p_settings.trial_reminder_enabled,true);assert.equal(run.calls[0].args.p_settings.actor_id,undefined);
});
test('retrying a notification cannot overwrite a subsequently saved attendance mark',async()=>{
 const run=scenario({data:{kind:'attendance',entityId:'student',date:'2026-10-15',variant:'present',classId:'class'}});
 const result=await run.actions.retryWhatsAppMessageAction('11111111-1111-4111-8111-111111111111',true);
 assert.equal(result.success,true);assert.equal(run.attendance.length,1);assert.equal(run.attendance[0][4],false);assert.equal(run.calls[0].args.p_confirm_uncertain,true);
});
