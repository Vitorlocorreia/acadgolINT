'use server'

import { requireStaff } from '@/lib/auth/session'
import {z} from 'zod'
import {dispatchSingleCallupWhatsAppAction} from '@/app/jogos/actions'
import {notifySingleStudentAttendanceAction} from '@/app/chamada/actions'
import type {WhatsAppConsole,WhatsAppSettings} from '@/lib/whatsapp/console'

import {
  sendEvolutionWhatsApp,
  getEvolutionInstanceStatus,
  getEvolutionQRCode,
  disconnectEvolutionWhatsApp,
} from '@/lib/whatsapp/evolution'

export async function checkWhatsAppStatusAction() {
  await requireStaff('communications.manage')
  return await getEvolutionInstanceStatus()
}

export async function getWhatsAppQRCodeAction() {
  await requireStaff('communications.manage')
  return await getEvolutionQRCode()
}

export async function disconnectWhatsAppAction() {
  await requireStaff('communications.manage')
  return await disconnectEvolutionWhatsApp()
}

export async function sendTestWhatsAppAction(phone: string, text: string) {
  await requireStaff('communications.manage')
  if (!phone || !text) {
    return { success: false, error: 'Telefone e mensagem são obrigatórios.' }
  }

  const res = await sendEvolutionWhatsApp({ phone, message: text })
  return res
}

export async function getWhatsAppConsoleAction(state='',offset=0):Promise<WhatsAppConsole> {
  const {db}=await requireStaff('communications.manage')
  const input=z.object({state:z.enum(['','queued','sending','accepted','failed','uncertain','cancelled']),offset:z.number().int().min(0).max(100000)}).parse({state,offset})
  const result=await db.rpc('whatsapp_console',{p_state:input.state,p_offset:input.offset})
  if(result.error||!result.data)throw new Error('Não foi possível carregar os registros de comunicação.')
  return result.data as WhatsAppConsole
}

export async function saveWhatsAppSettingsAction(settings:WhatsAppSettings) {
  const {db}=await requireStaff('communications.manage')
  const input=z.object({due_enabled:z.boolean(),overdue_enabled:z.boolean(),welcome_enabled:z.boolean(),receipt_enabled:z.boolean(),trial_confirmation_enabled:z.boolean(),trial_reminder_enabled:z.boolean(),send_hour:z.number().int().min(8).max(18),days_before:z.number().int().min(0).max(15)}).safeParse(settings)
  if(!input.success)return {success:false,error:'Confira os horários e as opções dos avisos.'}
  const result=await db.rpc('whatsapp_save_settings',{p_settings:input.data})
  return result.error?{success:false,error:'Não foi possível salvar as preferências.'}:{success:true}
}

export async function retryWhatsAppMessageAction(id:string,confirmedConversation=false) {
  const {db}=await requireStaff('communications.manage')
  if(!z.uuid().safeParse(id).success||typeof confirmedConversation!=='boolean')return {success:false,error:'Aviso inválido.'}
  const result=await db.rpc('whatsapp_retry',{p_job:id,p_confirm_uncertain:confirmedConversation})
  if(result.error||!result.data)return {success:false,error:result.error?.message||'Não foi possível autorizar a nova tentativa.'}
  const job=result.data
  if(job.kind==='callup'){
    const sent=await dispatchSingleCallupWhatsAppAction(job.entityId)
    return {success:sent.success,error:sent.success?undefined:sent.message,message:sent.message}
  }
  if(job.kind==='attendance'){
    const sent=await notifySingleStudentAttendanceAction(job.entityId,job.date,job.variant,job.classId,false)
    return {success:sent.success,error:sent.success?undefined:sent.message||sent.error,message:sent.message}
  }
  return {success:true,message:'Nova tentativa autorizada. O aviso será conferido e enviado pela rotina no horário configurado.'}
}
