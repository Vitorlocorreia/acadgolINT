// Render the real production template with fictional sample data; no database writes or messages.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
function load(relative){
 const filename=path.resolve(relative),result={};
 const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{exports:result,require:name=>name==='server-only'?{}:name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),process,Buffer,URL,AbortSignal,fetch,console,Uint8Array});return result;
}
(async()=>{
 const {callupCardModel}=load('lib/callups/model.ts'),{renderCallupCard}=load('lib/callups/card.tsx');
 const silhouette=Buffer.from('<svg width="600" height="650" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="650" fill="#2a242b"/><circle cx="300" cy="195" r="105" fill="#75646d"/><path d="M90 650V460Q110 330 230 320L300 365L370 320Q490 330 510 460V650" fill="#b31c35"/><path d="M240 360H280V650H240ZM320 360H360V650H320Z" fill="#1a171e"/><text x="300" y="570" text-anchor="middle" fill="#fff" font-size="130" font-family="sans-serif" font-weight="bold">9</text><text x="300" y="628" text-anchor="middle" fill="#fff" font-size="16" font-family="sans-serif">FOTO ILUSTRATIVA · SUBSTITUÍDA PELA FOTO DO ATLETA</text></svg>');
 const photo='data:image/png;base64,'+(await sharp(silhouette).png().toBuffer()).toString('base64');
 const sample={student:{name:'Lucas Gabriel',photo_url:photo},match:{title:'Festival de Futebol de Base',opponent:'Escolinha visitante',match_date:'2026-11-07',match_time:'09:00:00',location:'Campo de treinamento · Recife / PE',category:{name:'Sub-11'},notes:JSON.stringify({fee:0,userNotes:'Apresentação às 08h30. Levar uniforme completo, caneleira e garrafa de água.'})}};
 fs.mkdirSync('artifacts/callup-preview',{recursive:true});
 const variants=[['convocacao-sport.png',sample],['convocacao-nome-longo.png',{...sample,student:{name:'João Pedro de Albuquerque Vasconcelos e Silva Cavalcanti',photo_url:photo},match:{...sample.match,opponent:'Associação Esportiva de Desenvolvimento do Futebol Infantil de Pernambuco',location:'Centro de Treinamento de Futebol da Região Metropolitana do Recife · Avenida de acesso principal, Campo 02, entrada pelo portão da secretaria'}}],['convocacao-foto-pendente.png',{...sample,student:{name:'Atleta sem foto'}}]];
 for(const [name,data] of variants){const response=await renderCallupCard(callupCardModel(data));fs.writeFileSync(path.join('artifacts/callup-preview',name),Buffer.from(await response.arrayBuffer()));}
 console.log('Three preview images rendered successfully. All sample data is fictional.');
})().catch(error=>{console.error(error);process.exitCode=1});
