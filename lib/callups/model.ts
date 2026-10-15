import {extractMatchFee} from '@/app/jogos/utils'
const one=(value:any)=>Array.isArray(value)?value[0]||{}:value||{}
const text=(value:unknown,fallback='',limit=250)=>typeof value==='string'&&value.trim()?value.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,limit):fallback
export function callupInstructions(notes:unknown){
 if(typeof notes!=='string')return ''
 try {return text(JSON.parse(notes).userNotes,'',500)}catch{return notes.trim().startsWith('{')||/taxa\s*:/i.test(notes)?'':text(notes,'',500)}
}
export function callupCardModel(callup:any){
 const student=one(callup?.student),match=one(callup?.match)
 const date=text(match.match_date),parsedDate=new Date(date+'T12:00:00Z'),validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(parsedDate.valueOf())&&parsedDate.toISOString().slice(0,10)===date
 const fee=extractMatchFee(match.notes)
 return {
  studentName:text(student.name,'Atleta do Sport',120),photoUrl:text(student.photo_url,'',2000000),
  title:text(match.title,'Próximo desafio',120),opponent:text(match.opponent,'Adversário a confirmar',120),
  category:text(one(match.category).name,'Categoria a confirmar',60),
  date:validDate?date.split('-').reverse().join('/'):'Data a confirmar',
  weekday:validDate?new Intl.DateTimeFormat('pt-BR',{weekday:'long',timeZone:'America/Recife'}).format(new Date(date+'T12:00:00Z')):'',
  time:/^\d{2}:\d{2}/.test(text(match.match_time))?String(match.match_time).slice(0,5):'A confirmar',
  location:text(match.location,'Local a confirmar com a coordenação',250),coach:text(one(match.coach).name,'',120),instructions:callupInstructions(match.notes),fee:Number.isFinite(fee)&&fee>0?fee:0,
 }
}
export type CallupCardModel=ReturnType<typeof callupCardModel>
export function buildCallupCaption(callup:any,guardianName='',imageAttached=false){
 const m=callupCardModel(callup)
 return `🔴⚫ CONVOCAÇÃO · SPORT CLUB DO RECIFE\n\nOlá, ${text(guardianName,'responsável',120)}!\n${m.studentName} está convocado para o próximo desafio da escolinha.\n\n🏆 ${m.title}\n⚽ Sport × ${m.opponent}\n🎽 ${m.category}\n📅 ${m.date}${m.weekday?' · '+m.weekday:''}\n🕒 Jogo: ${m.time}\n📍 ${m.location}${m.coach?'\nTreinador: '+m.coach:''}${m.instructions?'\n\nOrientações: '+m.instructions:''}\n\n${m.fee?'Taxa: '+m.fee.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' · acerto com a coordenação.':'Participação gratuita.'}\nConfirme a presença com a coordenação.${imageAttached?'\n\nA arte personalizada da convocação segue em anexo.':''}\n\nPelo Sport tudo!`
}
