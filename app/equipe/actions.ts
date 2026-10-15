'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth/session'
import { manageStaff } from '@/lib/auth/edge-admin'
import { roles } from '@/lib/auth/permissions'

export async function getTeam() {
  const { db, staff } = await requireStaff('staff.coaches.manage')
  let query=db.from('staff_profiles').select('id,full_name,username,email,role,coach_id,active,must_change_password').eq('is_test',false).order('full_name')
  if(staff.role==='secretaria')query=query.eq('role','treinador')
  const [people, coaches] = await Promise.all([query, db.from('coaches').select('id,name').eq('is_active',true).order('name')])
  if (people.error || coaches.error) throw new Error('Não foi possível carregar a equipe.')
  return { people: people.data || [], coaches: coaches.data || [], viewer: staff.id, viewerRole:staff.role }
}
export async function createStaffAction(data: unknown) {
  const {staff}=await requireStaff('staff.coaches.manage')
  const input = z.object({ full_name: z.string().trim().min(2).max(120), username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/), email: z.union([z.email().max(254),z.literal('')]).optional(), role: z.enum(roles), coach_id: z.uuid().nullable().optional(),create_coach:z.boolean().optional() }).safeParse(data)
  if (!input.success) return { error: 'Revise nome, e-mail e perfil.' }
  if(staff.role==='secretaria'&&input.data.role!=='treinador')return {error:'A secretaria pode criar apenas acessos de treinadores.'}
  const result = await manageStaff({ action: 'create', ...input.data })
  if (result.success) { revalidatePath('/equipe'); revalidatePath('/turmas') }
  return result
}
export async function updateStaffAction(data: unknown) {
  const {staff,db}=await requireStaff('staff.coaches.manage')
  const input = z.object({ user_id: z.uuid(), username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/), email: z.union([z.email().max(254),z.literal('')]).transform(value=>value.trim().toLowerCase()), role: z.enum(roles), active: z.boolean(), coach_id: z.uuid().nullable().optional() }).safeParse(data)
  if (!input.success) return { error: 'Revise o acesso selecionado.' }
  if(staff.role==='secretaria'&&input.data.role!=='treinador')return {error:'A secretaria pode gerenciar apenas acessos de treinadores.'}
  const result = await manageStaff({ action:'update', ...input.data })
  if (result.success) {
    revalidatePath('/equipe'); revalidatePath('/turmas')
    if (result.selfUpdated) await db.auth.signOut({scope:'local'})
  }
  return result
}
export async function resetStaffPasswordAction(userId: string) {
  await requireStaff('staff.coaches.manage')
  if (!z.uuid().safeParse(userId).success) return { error: 'Acesso inválido.' }
  const result = await manageStaff({ action:'reset_password',user_id:userId })
  if (result.success) revalidatePath('/equipe')
  return result
}
