import { requirePage } from '@/lib/auth/session'
export const dynamic = 'force-dynamic'
import { CreatePanel } from '@/components/create-panel'
import { SubmitButton } from '@/components/submit-button'
import { PageHeader } from '@/components/page-header'
import { Shirt, PlusCircle } from 'lucide-react'
import { getUniformInventory, addUniformItemAction } from './actions'
import { UniformesClient } from './uniformes-client'

export default async function UniformesPage() {
  await requirePage('inventory.read');
  const inventory = await getUniformInventory()

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Gestão da escolinha" title="Uniformes" description="Consulte os tamanhos disponíveis e acompanhe as reposições." />

      <div className="workspace-layout">
        {/* Tabela de Estoque */}
        <div className="lg:col-span-2 space-y-4">
          <UniformesClient inventory={inventory} />
        </div>

        {/* Formulário: Cadastrar Novo Tamanho/Item */}
        <CreatePanel key={inventory.length} title="Novo item">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#c81930]" />
              Cadastrar Peça / Kit
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Adicione novo item ou tamanho ao estoque</p>
          </div>

          <form action={addUniformItemAction} className="space-y-4">
            <div>
              <label htmlFor="field-appuniformespagetsx-101" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Nome do Item <span className="text-red-500">*</span>
              </label>
              <input id="field-appuniformespagetsx-101"
                type="text"
                name="item_name"
                required
                defaultValue="Kit Oficial Escolinha do Sport"
                className="input-escolinha"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="uniformes-field-1" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Tipo
                </label>
                <select id="uniformes-field-1" name="item_type" className="input-escolinha cursor-pointer">
                  <option value="kit_complete">Kit Completo</option>
                  <option value="shirt">Apenas Camisa</option>
                  <option value="shorts">Apenas Calção</option>
                  <option value="socks">Meião</option>
                </select>
              </div>

              <div>
                <label htmlFor="field-appuniformespagetsx-102" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Tamanho <span className="text-red-500">*</span>
                </label>
                <input id="field-appuniformespagetsx-102"
                  type="text"
                  name="size"
                  required
                  placeholder="Ex: 10, P, M, G"
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-appuniformespagetsx-103" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Quantidade Inicial <span className="text-red-500">*</span>
                </label>
                <input id="field-appuniformespagetsx-103"
                  type="number"
                  name="quantity"
                  defaultValue="10"
                  min="0"
                  required
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label htmlFor="field-appuniformespagetsx-104" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                  Estoque Mínimo <span className="text-red-500">*</span>
                </label>
                <input id="field-appuniformespagetsx-104"
                  type="number"
                  name="min_threshold"
                  defaultValue="5"
                  min="1"
                  required
                  className="input-escolinha font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-appuniformespagetsx-105" className="block text-xs font-bold  tracking-normal text-[var(--text-secondary)] mb-1">
                Preço de Venda (R$)
              </label>
              <input id="field-appuniformespagetsx-105"
                type="number"
                name="unit_price"
                defaultValue="150.00"
                step="0.01"
                className="input-escolinha font-mono"
              />
            </div>

            <SubmitButton>
              Adicionar ao Estoque
            </SubmitButton>
          </form>
        </CreatePanel>
      </div>
    </div>
  )
}
