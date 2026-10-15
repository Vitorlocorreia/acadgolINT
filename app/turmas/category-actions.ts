'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  min_age: z.number().int().min(0).max(100),
  max_age: z.number().int().min(0).max(100),
  description: z.string().trim().max(500).optional(),
}).refine(value => value.max_age >= value.min_age)

export async function createAgeCategoryAction(payload: unknown) {
  const db = await createAdminClient('classes.write')
  const input = categorySchema.safeParse(payload)
  if (!input.success) return { error: 'Informe um nome de 2 a 100 caracteres e idades inteiras entre 0 e 100. A idade máxima deve ser igual ou maior que a mínima.' }

  const { data, error } = await db.from('categories').insert({
    ...input.data,
    description: input.data.description || null,
  }).select('id,name,min_age,max_age').single()
  if (error || !data) return { error: error?.code === '23505'
    ? 'Já existe uma categoria com esse nome. Selecione a categoria existente ou use outro nome.'
    : 'Não foi possível adicionar a categoria. Tente novamente.' }

  revalidatePath('/turmas')
  revalidatePath('/alunos/novo')
  revalidatePath('/jogos')
  return { category: data as { id: string; name: string; min_age: number; max_age: number } }
}
