const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const {sendTrackedWhatsApp}=loadTS('lib/whatsapp/tracked.ts',{'server-only':{}});
const event={kind:'attendance',entityId:'student',guardianId:'guardian',classId:'class',date:'2026-10-15',variant:'present',message:'Fixture'};
function database(){
 let state='queued';const results=[];
 return {results,rpc:async(name,args)=>{
  if(name==='whatsapp_reserve'){
   if(state!=='queued')return {data:{state},error:null};state='sending';return {data:{id:'job',claim:'claim',phone:'81900000000',state},error:null};
  }
  state=args.p_result;results.push(args);return {data:true,error:null};
 }};
}
test('duplicate and concurrent saves do not contact the provider twice',async()=>{
 const db=database();let calls=0;const send=async()=>{calls++;return {success:true,messageId:'fixture'};};
 const outcomes=await Promise.all([sendTrackedWhatsApp(db,event,send),sendTrackedWhatsApp(db,event,send)]);
 assert.equal(calls,1);assert.ok(outcomes.some(r=>r.status==='accepted'));assert.ok(outcomes.some(r=>r.status==='blocked'));
 assert.equal((await sendTrackedWhatsApp(db,event,send)).status,'already_accepted');assert.equal(calls,1);
});
test('an unavailable outbox fails closed without sending',async()=>{
 let calls=0;const result=await sendTrackedWhatsApp({rpc:async()=>({data:null,error:{message:'offline'}})},event,async()=>{calls++;});
 assert.equal(result.status,'failed');assert.equal(calls,0);
});
test('timeouts are persisted as uncertain and never retried by a second save',async()=>{
 const db=database();let calls=0;const send=async()=>{calls++;throw Error('timeout');};
 await sendTrackedWhatsApp(db,event,send);assert.equal(db.results[0].p_result,'uncertain');
 assert.equal((await sendTrackedWhatsApp(db,event,send)).status,'blocked');assert.equal(calls,1);
});
test('provider acceptance without a saved result remains blocked for review',async()=>{
 const result=await sendTrackedWhatsApp({rpc:async name=>name==='whatsapp_reserve'?{data:{id:'job',claim:'claim',phone:'81900000000'}}:{data:false,error:null}},event,async()=>({success:true,messageId:'fixture'}));
 assert.equal(result.status,'blocked');assert.match(result.error,/não foi registrado/);
});
test('a known provider rejection is recorded separately from uncertainty',async()=>{
 const db=database();await sendTrackedWhatsApp(db,event,async()=>({success:false,error:'Chave recusada',uncertain:false}));
 assert.equal(db.results[0].p_result,'failed');
});
test('scheduled worker sends only once and classifies unknown outcomes conservatively',async()=>{
 const {deliverText}=await import('../scripts/whatsapp-worker.mjs');const config={url:'https://fixture.invalid',key:'fixture',instance:'fixture'};const job={phone:'81900000000',message:'Fixture'};
 let calls=0;const accepted=await deliverText(config,job,async(_url,request)=>{calls++;assert.equal(JSON.parse(request.body).number,'5581900000000');return {ok:true,status:201,json:async()=>({key:{id:'fixture'}})};});assert.equal(accepted.result,'accepted');assert.equal(calls,1);
 for(const status of [401,429,503,200]){const r=await deliverText(config,job,async()=>({ok:status===200,status,json:async()=>({})}));assert.equal(r.result,status>=500||status===200?'uncertain':'failed');}
 assert.equal((await deliverText(config,job,async()=>{throw Error('timeout')})).result,'uncertain');
 assert.equal((await deliverText(config,{...job,phone:'1'},async()=>{throw Error('should not fetch')})).result,'failed');
});
