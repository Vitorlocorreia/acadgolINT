'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EnrollmentPlan } from './types'

const money = z.number().min(0).max(100000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7)
const planSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  price: money,
  registration_fee: money,
  frequency_per_week: z.number().int().min(1).max(7),
  duration_months: z.number().int().min(1).max(36),
  sibling_discount_percent: z.number().min(0).max(100).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7),
  includes_uniform: z.boolean(),
  is_active: z.boolean(),
})

export async function getEnrollmentPlans(): Promise<EnrollmentPlan[]> {
  const db = await createAdminClient('plans.read')
  const { data, error } = await db.from('plans')
    .select('id,name,price,registration_fee,frequency_per_week,duration_months,sibling_discount_percent,includes_uniform,is_active')
    .order('is_active', { ascending: false }).order('price').order('name')
  if (error) throw new Error('Não foi possível carregar os planos de matrícula. Tente novamente.')
  return data || []
}

export async function saveEnrollmentPlanAction(payload: unknown) {
  const db = await createAdminClient('plans.write')
  const parsed = planSchema.safeParse(payload)
  if (!parsed.success) return { error: 'Revise os campos. Use valores positivos ou zero, até duas casas decimais, frequência de 1 a 7 e prazo de 1 a 36 meses.' }
  const { id, ...values } = parsed.data
  const query = id ? db.from('plans').update(values).eq('id', id) : db.from('plans').insert(values)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) return { error: 'Não foi possível salvar o plano. Tente novamente.' }
  if (!data) return { error: 'Plano não encontrado ou indisponível para edição. Atualize a página.' }
  revalidatePath('/planos')
  revalidatePath('/alunos/novo')
  revalidatePath('/alunos')
  revalidatePath('/experimentais')
  return { success: true }
}
