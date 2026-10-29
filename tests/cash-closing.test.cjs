const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const model=loadTS('lib/finance/cash-closing.ts',{zod:require('zod')});
const key='10000000-0000-4000-8000-000000000001',closureId='20000000-0000-4000-8000-000000000001';
const totals={dinheiro:60,pix:40,debito:0,credito:0,total:100};
const payload={date:'2001-02-03',key,fingerprint:'a'.repeat(32),openingCash:20,counted:{dinheiro:80,pix:40,debito:0,credito:0},differenceReason:'',notes:''};
function scenario(response={data:{success:true,closureId,revision:1,alreadyProcessed:false},error:null},allowed=true){
 const calls=[],permissions=[],paths=[];
 const actions=loadTS('app/financeiro/cash-closing-actions.ts',{
  zod:require('zod'),'@/lib/finance/cash-closing':model,'next/cache':{revalidatePath:path=>paths.push(path)},
  '@/lib/supabase/admin':{createAdminClient:async permission=>{permissions.push(permission);if(!allowed)throw Error('Acesso negado');return {rpc:async(name,args)=>{calls.push({name,args:JSON.parse(JSON.stringify(args))});return response}}}}
 });return {actions,calls,permissions,paths};
}
test('cash reconciliation adds only the initial cash fund and does not hide offsetting method differences',()=>{
 const balanced=model.reconciliation(totals,20,payload.counted);assert.equal(balanced.expected.dinheiro,80);assert.equal(balanced.expected.total,120);assert.equal(balanced.hasDifference,false);
 const offset=model.reconciliation(totals,20,{dinheiro:90,pix:30,debito:0,credito:0});assert.equal(offset.difference.total,0);assert.equal(offset.difference.dinheiro,10);assert.equal(offset.difference.pix,-10);assert.equal(offset.hasDifference,true);
 const cents=model.reconciliation({dinheiro:0.1,pix:0.2,debito:0,credito:0,total:0.3},0.2,{dinheiro:0.3,pix:0.2,debito:0,credito:0});assert.equal(cents.difference.total,0);assert.equal(cents.hasDifference,false);
});
test('closing sends the original fingerprint and retry key, never client totals or a forged operator',async()=>{
 const run=scenario();const result=await run.actions.closeCashDayAction({...payload,closed_by:'forged',actor_snapshot:{name:'forged'},expected:{total:9999}});
 assert.equal(result.success,true);assert.deepEqual(run.calls,[{name:'close_cash_day',args:{p_payload:payload}}]);assert.deepEqual(run.permissions,['finance.write']);assert.deepEqual(run.paths,['/financeiro']);
});
test('invalid counted values, dates, fingerprints and retry keys cannot reach the database',async()=>{
 for(const invalid of [{...payload,date:'2001-02-30'},{...payload,key:'bad'},{...payload,fingerprint:''},{...payload,openingCash:-1},{...payload,counted:{...payload.counted,pix:0.001}},{...payload,counted:{dinheiro:80}}]){
  const run=scenario();assert.equal((await run.actions.closeCashDayAction(invalid)).success,false);assert.equal(run.calls.length,0);
 }
});
test('failed/stale closing and unverified responses never report a saved close',async()=>{
 for(const response of [{data:null,error:{message:'Os recebimentos mudaram. Atualize a conferência.'}},{data:null,error:null},{data:{success:true},error:null}]){
  const run=scenario(response);assert.equal((await run.actions.closeCashDayAction(payload)).success,false);assert.equal(run.paths.length,0);
 }
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.closeCashDayAction(payload),/Acesso negado/);assert.equal(denied.calls.length,0);
});
test('reopening requires a valid closure, a reason and the guarded RPC rather than changing a snapshot',async()=>{
 const run=scenario({data:{success:true,alreadyReopened:false},error:null});assert.equal((await run.actions.reopenCashDayAction(closureId,'  Conferir lançamento  ')).success,true);
 assert.deepEqual(run.calls,[{name:'reopen_cash_day',args:{p_closure:closureId,p_reason:'Conferir lançamento'}}]);assert.deepEqual(run.paths,['/financeiro']);
 for(const [id,reason] of [[closureId,'x'],['bad','Motivo válido']]){const failed=scenario();assert.equal((await failed.actions.reopenCashDayAction(id,reason)).success,false);assert.equal(failed.calls.length,0);}
 const denied=scenario({data:null,error:{message:'Somente administrador ou secretaria pode reabrir o caixa.'}});const result=await denied.actions.reopenCashDayAction(closureId,'Conferir lançamento');assert.equal(result.success,false);assert.match(result.error,/Somente administrador/);assert.equal(denied.paths.length,0);
});
test('report/document reads require finance access and reject partial or mismatched data',async()=>{
 const denied=scenario(undefined,false);await assert.rejects(denied.actions.getCashDayReportAction('2001-02-03'),/Acesso negado/);assert.deepEqual(denied.permissions,['finance.read']);
 for(const data of [null,{date:'2001-02-03',state:'open'},{}]){const run=scenario({data,error:null});assert.equal((await run.actions.getCashDayReportAction('2001-02-03')).success,false);}
 const invalid=scenario();assert.equal((await invalid.actions.getCashDayReportAction('bad')).success,false);assert.equal((await invalid.actions.getCashClosureDocumentAction('bad')).success,false);assert.equal(invalid.calls.length,0);
 const missing=scenario({data:null,error:{message:'Fechamento não encontrado.'}});assert.equal((await missing.actions.getCashClosureDocumentAction(closureId)).success,false);
});

test('the printable document renders stored values and the original actor after reopening',async()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');let reads=0;
 const source={date:payload.date,totals,count:1,reversedCount:0,fingerprint:payload.fingerprint,entries:[{invoiceId:key,paymentId:null,studentName:'Atleta fictício do documento',referenceMonth:'2001-03',chargeType:'monthly',agreedAmount:120,receivedAmount:100,paidAt:'2001-02-03T15:00:00Z',recordedAt:null,actorName:'Operador original',parts:[{method:'dinheiro',amount:60},{method:'pix',amount:40}]}]};
 const document={id:closureId,business_date:payload.date,revision:1,opening_cash:20,expected:{...totals,dinheiro:80,total:120},counted:{...totals,dinheiro:80,total:120},difference:{dinheiro:0,pix:0,debito:0,credito:0,total:0},difference_reason:'',notes:'Documento preservado',actor_snapshot:{name:'Responsável original',username:'secretaria',role:'secretaria'},closed_at:'2001-02-03T22:00:00Z',snapshot:source,reopening:{reason:'Correção autorizada',actor:{name:'Administrador',username:'admin',role:'admin'},at:'2001-02-04T12:00:00Z'}};
 const page=loadTS('app/financeiro/caixa/[closureId]/page.tsx',{
  'react/jsx-runtime':require('react/jsx-runtime'),'next/link':{default:props=>React.createElement('a',props)},
  '@/lib/auth/session':{requirePage:async permission=>assert.equal(permission,'finance.read')},'@/lib/finance/cash-closing':model,
  '../../cash-closing-actions':{getCashClosureDocumentAction:async id=>{reads++;assert.equal(id,closureId);return {success:true,document}}},'./print-button':{CashPrintButton:()=>React.createElement('button',null,'Imprimir')}
 });
 const html=renderToStaticMarkup(await page.default({params:Promise.resolve({closureId})}));assert.equal(reads,1);assert.match(html,/Responsável original/);assert.match(html,/Operador original/);assert.match(html,/Atleta fictício do documento/);assert.match(html,/Correção autorizada/);assert.match(html,/Documento preservado/);assert.match(html,/Versão/);
});
