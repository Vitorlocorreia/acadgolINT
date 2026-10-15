import 'server-only'
import {ImageResponse} from 'next/og'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {type CallupCardModel} from './model'
const WIDTH=1080,HEIGHT=1350
let assets:Promise<{crest:string;font:Buffer;body:Buffer;bold:Buffer}>|undefined
function cardAssets(){return assets??=Promise.all([readFile(path.join(process.cwd(),'public/sport-recife.svg')),readFile(path.join(process.cwd(),'public/fonts/Anton-Regular.ttf')),readFile(path.join(process.cwd(),'public/fonts/Barlow-Regular.ttf')),readFile(path.join(process.cwd(),'public/fonts/Barlow-SemiBold.ttf'))]).then(([crest,font,body,bold])=>({crest:'data:image/svg+xml;base64,'+crest.toString('base64'),font,body,bold}))}
export function allowedAthletePhoto(candidate:string,storageUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||''){
 if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(candidate)&&candidate.length<1800000)return true
 try {const url=new URL(candidate),base=new URL(storageUrl);return url.origin===base.origin&&url.pathname.startsWith('/storage/v1/object/public/avatars/')&&!url.username&&!url.password}catch{return false}
}
async function loadPhoto(candidate:string){
 if(!allowedAthletePhoto(candidate))return ''
 if(candidate.startsWith('data:'))return candidate
 try {
  const response=await fetch(candidate,{redirect:'error',signal:AbortSignal.timeout(5000),cache:'no-store'}),mime=response.headers.get('content-type')?.split(';')[0]||''
  if(!response.ok||!['image/png','image/jpeg','image/webp'].includes(mime)||Number(response.headers.get('content-length')||0)>1500000)return ''
  const reader=response.body?.getReader();if(!reader)return ''
  const chunks:Uint8Array[]=[];let size=0
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1500000){await reader.cancel();return ''}chunks.push(part.value)}
  return `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`
 }catch{return ''}
}
export async function renderCallupCard(model:CallupCardModel,{requirePhoto=false}:{requirePhoto?:boolean}={}){
 const [{crest,font,body,bold},photo]=await Promise.all([cardAssets(),loadPhoto(model.photoUrl)])
 if(requirePhoto&&!photo)throw new Error('Cadastre uma foto válida do atleta antes de enviar a convocação personalizada.')
 const nameSize=model.studentName.length>65?42:model.studentName.length>35?55:72,opponentSize=model.opponent.length>65?27:model.opponent.length>32?36:48
 const initials=model.studentName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('')
 return new ImageResponse(<div style={{display:'flex',width:WIDTH,height:HEIGHT,background:'#0b0b0e',color:'#fff',position:'relative',fontFamily:'Barlow',overflow:'hidden'}}>
  <div style={{display:'flex',position:'absolute',inset:0,backgroundImage:'linear-gradient(115deg, #151519 0%, #09090c 61%, #480511 100%)'}}/>
  <div style={{display:'flex',position:'absolute',right:-180,top:260,width:430,height:920,background:'#c81930',transform:'rotate(19deg)',opacity:0.17}}/>
  <div style={{display:'flex',position:'absolute',top:0,left:0,width:WIDTH,height:10,background:'#e1233e'}}/>
  <div style={{display:'flex',position:'absolute',left:60,right:60,top:46,alignItems:'center',justifyContent:'space-between'}}>
   <div style={{display:'flex',gap:24,alignItems:'center'}}><img src={crest} width={74} height={98} alt="Escudo do Sport"/><div style={{display:'flex',flexDirection:'column',gap:9}}><span style={{fontSize:27,fontWeight:700,letterSpacing:1}}>SPORT CLUB DO RECIFE</span><span style={{fontSize:19,color:'#c4c4cd',letterSpacing:3}}>ESCOLINHA DE FUTEBOL</span></div></div>
   <div style={{display:'flex',border:'1px solid #55515a',padding:'12px 17px',fontSize:17,letterSpacing:2}}>NOSSA BASE. NOSSO FUTURO.</div>
  </div>
  <div style={{display:'flex',position:'absolute',left:60,top:187,fontSize:20,letterSpacing:6,color:'#f35a70'}}>SEU LUGAR É EM CAMPO.</div>
  <div style={{display:'flex',position:'absolute',left:55,top:211,fontFamily:'Anton',fontSize:146,letterSpacing:1,lineHeight:1.2}}>CONVOCADO</div>
  <div style={{display:'flex',position:'absolute',left:60,top:393,width:514,height:515,border:'2px solid #e1233e',background:'#21141b',overflow:'hidden'}}>
   {photo?<img src={photo} width={514} height={515} style={{objectFit:'cover',objectPosition:'center 24%'}} alt={model.studentName}/>:<div style={{display:'flex',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',flexDirection:'column',backgroundImage:'linear-gradient(145deg,#48202b,#131317)',gap:22}}><span style={{fontFamily:'Anton',fontSize:148,color:'#7f5260'}}>{initials}</span><span style={{fontSize:19,letterSpacing:3,color:'#e6b7c1'}}>FOTO PENDENTE</span></div>}
   <div style={{display:'flex',position:'absolute',left:0,right:0,bottom:0,height:130,backgroundImage:'linear-gradient(0deg,rgba(8,8,12,0.8),rgba(8,8,12,0))'}}/>
   <span style={{display:'flex',position:'absolute',left:22,bottom:22,fontSize:17,letterSpacing:3}}>UM NOVO DESAFIO. A MESMA RAÇA.</span>
  </div>
  <div style={{display:'flex',position:'absolute',left:620,top:400,width:400,height:505,flexDirection:'column',justifyContent:'space-between'}}>
   <div style={{display:'flex',flexDirection:'column',gap:12}}><span style={{display:'flex',alignSelf:'flex-start',background:'#c81930',padding:'10px 16px',fontSize:model.category.length>32?16:20,fontWeight:700}}>{model.category.toLocaleUpperCase('pt-BR')}</span><span style={{fontSize:18,color:'#babac5',letterSpacing:2}}>NOSSO PRÓXIMO DESAFIO</span><span style={{fontFamily:'Anton',fontSize:40}}>SPORT <span style={{color:'#f04963'}}> ×</span></span><span style={{fontFamily:'Anton',fontSize:opponentSize,lineHeight:1.1}}>{model.opponent.toLocaleUpperCase('pt-BR')}</span><span style={{fontSize:20,color:'#d0cbd3',lineHeight:1.2}}>{model.title.slice(0,80)}{model.title.length>80?'…':''}</span></div>
   <div style={{display:'flex',flexDirection:'column',gap:10,borderTop:'1px solid #6c2532',paddingTop:17}}><span style={{fontSize:16,color:'#f35a70',letterSpacing:2}}>ORIENTAÇÕES</span><span style={{fontSize:19,lineHeight:1.4}}>{model.instructions?model.instructions.slice(0,110)+(model.instructions.length>110?'…':''):'Confirme sua presença com a coordenação.'}</span><span style={{fontSize:17,color:'#bcb6c2'}}>{model.fee?`Inscrição: ${model.fee.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · coordenação`:'Participação gratuita'}</span></div>
  </div>
  <div style={{display:'flex',position:'absolute',left:60,right:60,top:945,height:130,flexDirection:'column',gap:8}}><span style={{fontSize:17,letterSpacing:4,color:'#f35a70'}}>ATLETA CONVOCADO</span><span style={{fontFamily:'Anton',fontSize:nameSize,lineHeight:1.05}}>{model.studentName.toLocaleUpperCase('pt-BR')}</span></div>
  <div style={{display:'flex',position:'absolute',left:60,right:60,top:1108,height:190,background:'#f4f1ed',color:'#151519',padding:'22px 28px',flexDirection:'column',gap:17}}>
   <div style={{display:'flex',gap:35}}><div style={{display:'flex',width:340,flexDirection:'column',gap:6}}><span style={{fontSize:15,letterSpacing:2,color:'#6b5258'}}>DATA DO JOGO</span><span style={{fontSize:31,fontWeight:700}}>{model.date}</span></div><div style={{display:'flex',width:190,flexDirection:'column',gap:6}}><span style={{fontSize:15,letterSpacing:2,color:'#6b5258'}}>HORÁRIO</span><span style={{fontSize:31,fontWeight:700}}>{model.time}</span></div><div style={{display:'flex',flex:1,alignItems:'center',fontSize:17,color:'#6b5258'}}>{model.weekday.toLocaleUpperCase('pt-BR')}</div></div>
   <div style={{display:'flex',gap:15,borderTop:'1px solid #d6cbd0',paddingTop:13,alignItems:'flex-start'}}><span style={{fontSize:15,color:'#8e1730',fontWeight:700,paddingTop:3}}>LOCAL</span><span style={{fontSize:model.location.length>150?16:model.location.length>95?19:23,lineHeight:1.25}}>{model.location}</span></div>
  </div>
  <div style={{display:'flex',position:'absolute',bottom:0,left:0,right:0,height:30,background:'#c81930',alignItems:'center',justifyContent:'space-between',padding:'0 60px',fontSize:14,letterSpacing:2}}><span>PELO SPORT TUDO.</span><span>CONVOCAÇÃO INDIVIDUAL · ESCOLINHA DE FUTEBOL</span></div>
 </div>,{width:WIDTH,height:HEIGHT,fonts:[{name:'Anton',data:font,weight:400,style:'normal'},{name:'Barlow',data:body,weight:400,style:'normal'},{name:'Barlow',data:bold,weight:700,style:'normal'}],headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
