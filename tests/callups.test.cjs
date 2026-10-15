const test=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./support/load-ts.cjs');
const utils=loadTS('app/jogos/utils.ts'),model=loadTS('lib/callups/model.ts',{'@/app/jogos/utils':utils});
const callup=()=>({id:'callup-1',student:{name:'João Gabriel',photo_url:'data:image/png;base64,photo',guardian:[{id:'guardian-a',name:'Responsável A',phone:'81900000001'},{id:'guardian-b',name:'Responsável B',phone:'81900000002'},{name:'Sem notificações',phone:'81900000003',receives_notifications:false}]},match:{id:'match-1',title:'Festival de base',opponent:'Visitante',match_date:'2027-02-13',match_time:'09:00:00',location:'Campo visitante · Recife',category:{name:'Sub-11'},notes:JSON.stringify({fee:25,userNotes:'Apresentação às 08h30. Levar caneleira.'})}});
test('callup model keeps the actual match year, category and instructions without inventing missing details',()=>{
 const m=model.callupCardModel(callup());assert.equal(m.date,'13/02/2027');assert.equal(m.weekday,'sábado');assert.equal(m.time,'09:00');assert.equal(m.fee,25);assert.match(m.instructions,/08h30/);
 const absent=model.callupCardModel({});assert.match(absent.date,/confirmar/);assert.match(absent.location,/confirmar/);assert.equal(absent.photoUrl,'');assert.equal(absent.coach,'');
 assert.equal(model.callupCardModel({match:{match_date:'2027-02-31'}}).date,'Data a confirmar');
});
test('notes support existing plain instructions and never expose metadata as instructions',()=>{
 assert.equal(model.callupInstructions('Levar água.'),'Levar água.');assert.equal(model.callupInstructions('{"fee":10}'),'');assert.equal(model.callupInstructions('taxa: R$ 10'),'');assert.equal(model.callupInstructions('{invalid'), '');
});
test('manual captions do not claim an attached image and keep the full instructions and location',()=>{
 const c=callup();c.match.notes=JSON.stringify({fee:0,userNotes:'Texto completo de apresentação e equipamentos. '.repeat(8)});
 const manual=model.buildCallupCaption(c,'Mãe do atleta',false),media=model.buildCallupCaption(c,'Mãe do atleta',true);
 assert.match(manual,/Campo visitante/);assert.match(manual,/Participação gratuita/);assert.doesNotMatch(manual,/segue em anexo/);assert.match(media,/segue em anexo/);assert.ok(manual.includes(model.callupInstructions(c.match.notes)));
});
function scenario({missingPhoto=false,deliveryFailure=false}={}){
 const renderings=[],messages=[];const c=callup();
 const match={...c.match,callups:[c,{...callup(),id:'callup-2',student:{...c.student,name:'Lucas Pedro'}}]};
 const actions=loadTS('app/jogos/actions.ts',{
  '@/lib/supabase/admin':{createAdminClient:async permission=>{assert.equal(permission,'games.write');return {rpc:async name=>({data:name==='staff_matches'?[match]:c,error:null})};}},
  '@/lib/supabase/family':{},'next/cache':{revalidatePath:()=>{}},'next/navigation':{},
  '@/lib/callups/model':model,'@/lib/callups/card':{renderCallupCard:async (m,options)=>{renderings.push(m);assert.equal(options.requirePhoto,true);if(missingPhoto)throw Error('Cadastre uma foto válida do atleta.');return {arrayBuffer:async()=>Buffer.from('PNG fixture')};}},
  '@/lib/whatsapp/tracked':{sendTrackedWhatsApp:async (_db,event,deliver)=>{const g=c.student.guardian.find(g=>g.id===event.guardianId);const r=await deliver(g.phone);return {status:r.success?'accepted':'failed'};}},
  '@/lib/whatsapp/evolution':{sendEvolutionWhatsAppMedia:async payload=>{messages.push(payload);return {success:!deliveryFailure};}},
 },{Buffer,Error});return {actions,renderings,messages};
}
test('individual dispatch renders one image and sends it to all opted-in guardians only',async()=>{
 const run=scenario(),result=await run.actions.dispatchSingleCallupWhatsAppAction('callup-1');
 assert.equal(result.success,true);assert.equal(run.renderings.length,1);assert.equal(run.messages.length,2);
 for(const sent of run.messages){assert.equal(sent.mimetype,'image/png');assert.equal(sent.fallbackToText,false);assert.match(sent.caption,/João Gabriel/);assert.match(sent.caption,/segue em anexo/);assert.match(sent.fileName,/^convocacao_/);}
});
test('concurrent batch workers count every recipient and reuse one rendering per athlete',async()=>{
 const run=scenario(),result=await run.actions.dispatchMatchCallupsWhatsAppAction('match-1');assert.equal(result.success,true);assert.equal(result.sentCount,4);assert.equal(result.totalGuardians,4);assert.equal(run.renderings.length,2);assert.equal(run.messages.length,4);
});
test('missing athlete photos prevent sending a generic substitute as a personalized image',async()=>{
 const run=scenario({missingPhoto:true}),result=await run.actions.dispatchSingleCallupWhatsAppAction('callup-1');assert.equal(result.success,false);assert.match(result.message,/foto válida/);assert.equal(run.messages.length,0);
});
test('delivery failures are not reported as successful personalized convocations',async()=>{
 const run=scenario({deliveryFailure:true}),result=await run.actions.dispatchMatchCallupsWhatsAppAction('match-1');assert.equal(result.success,false);assert.equal(result.sentCount,0);assert.equal(result.totalGuardians,4);
});
test('athlete images accept local encoded photos or the project avatar bucket and reject arbitrary network targets',()=>{
 const card=loadTS('lib/callups/card.tsx',{'server-only':{},'next/og':{},'node:fs/promises':{},'node:path':{},'react/jsx-runtime':{}},{URL,process:{env:{}}});
 const base='https://school.supabase.co';
 for(const source of ['http://127.0.0.1:3000/private','http://169.254.169.254/metadata','https://elsewhere.example/photo.jpg',base+'/storage/v1/object/public/payment-proofs/proof.png','data:image/svg+xml;base64,AAAA'])assert.equal(card.allowedAthletePhoto(source,base),false);
 assert.equal(card.allowedAthletePhoto('data:image/png;base64,AAAA',base),true);
 assert.equal(card.allowedAthletePhoto(base+'/storage/v1/object/public/avatars/student.jpg',base),true);
});
test('an image delivery error cannot silently turn the personalized announcement into a text-only success',async()=>{
 const requests=[];
 const client=loadTS('lib/whatsapp/evolution.ts',{'server-only':{},qrcode:{default:require('qrcode')}},{process:{env:{EVOLUTION_API_URL:'https://whatsapp.example',EVOLUTION_API_KEY:'fixture-only',EVOLUTION_INSTANCE_NAME:'test'}},URL,AbortSignal,fetch:async url=>{requests.push(url);return {ok:false,status:503,json:async()=> ({error:'offline'})};}});
 const result=await client.sendEvolutionWhatsAppMedia({phone:'81900000000',media:'base64-fixture',caption:'Fixture',fallbackToText:false});
 assert.equal(result.success,false);assert.equal(requests.length,1);assert.match(requests[0],/sendMedia/);
});
