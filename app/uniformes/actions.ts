'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getUniformInventory() {
  const supabase = await createAdminClient('inventory.read')

  const { data, error } = await supabase
    .from('uniform_inventory')
    .select('*')
    .order('size', { ascending: true })

  if (error) {
    console.error('Erro ao buscar estoque de uniformes:', error)
    throw new Error('Não foi possível carregar o estoque. Tente novamente.')
  }

  return data ?? []
}

export async function updateUniformStockAction(id: string, newQuantity: number) {
  const supabase = await createAdminClient('inventory.write')

  const {data,error}=await supabase.rpc('adjust_uniform_stock',{p_item:id,p_delta:newQuantity});
 if(error)return {success:false,error:error.message};revalidatePath('/uniformes');return {success:true,quantity:data.quantity};
}


export async function addUniformItemAction(formData: FormData): Promise<void> {
  const supabase = await createAdminClient('inventory.write')

  const newItem = {
    item_name: String(formData.get('item_name')),
    item_type: String(formData.get('item_type') || 'kit_complete'),
    size: String(formData.get('size')),
    quantity: parseInt(String(formData.get('quantity') || '0')),
    min_threshold: parseInt(String(formData.get('min_threshold') || '5')),
    unit_price: parseFloat(String(formData.get('unit_price') || '150.00')),
  }

  const { error } = await supabase.from('uniform_inventory').insert(newItem)

  if (error) {
    throw new Error('Erro ao adicionar uniforme: ' + error.message)
  }

  revalidatePath('/uniformes')
}
