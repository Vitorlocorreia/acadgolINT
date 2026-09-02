import { Shirt, PlusCircle } from 'lucide-react'
import { getUniformInventory, addUniformItemAction } from './actions'
import { UniformesClient } from './uniformes-client'

export default async function UniformesPage() {
  const inventory = await getUniformInventory()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
            <Shirt className="w-8 h-8 text-[#1A6B2E]" />
            Estoque de Uniformes & Kits Oficiais ({inventory.length} tamanhos)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle de kits de camisa, calção e meião para entrega no ato da matrícula.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabela de Estoque */}
        <div className="lg:col-span-2 space-y-4">
          <UniformesClient inventory={inventory} />
        </div>

        {/* Formulário: Cadastrar Novo Tamanho/Item */}
        <div className="card-light p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#1A6B2E]" />
              Cadastrar Peça / Kit
            </h3>
            <p className="text-xs text-slate-500 mt-1">Adicione novo item ou tamanho ao estoque</p>
          </div>

          <form action={addUniformItemAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome do Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="item_name"
                required
                defaultValue="Kit Oficial Academia do Gol"
                className="input-escolinha"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tipo
                </label>
                <select name="item_type" className="input-escolinha cursor-pointer">
                  <option value="kit_complete">Kit Completo</option>
                  <option value="shirt">Apenas Camisa</option>
                  <option value="shorts">Apenas Calção</option>
                  <option value="socks">Meião</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tamanho <span className="text-red-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Quantidade Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  defaultValue="10"
                  min="0"
                  required
                  className="input-escolinha font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Estoque Mínimo <span className="text-red-500">*</span>
                </label>
                <input
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                name="unit_price"
                defaultValue="150.00"
                step="0.01"
                className="input-escolinha font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white font-bold text-xs uppercase tracking-wider rounded-[4px] shadow-xs transition-all cursor-pointer"
            >
              Adicionar ao Estoque
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
