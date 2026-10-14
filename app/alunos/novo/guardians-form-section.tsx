'use client'

import { useState } from 'react'
import { Users, UserPlus, Trash2, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react'

export interface GuardianItem {
  id: string
  name: string
  relationship: string
  cpf: string
  phone: string
  email: string
  receives_notifications: boolean
}

export function GuardiansFormSection() {
  const [guardians, setGuardians] = useState<GuardianItem[]>([
    {
      id: 'g-1',
      name: '',
      relationship: 'Mãe',
      cpf: '',
      phone: '',
      email: '',
      receives_notifications: true,
    },
  ])

  const addGuardian = () => {
    const nextRel = guardians.length === 1 ? 'Pai' : 'Responsável Legal'
    setGuardians((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        name: '',
        relationship: nextRel,
        cpf: '',
        phone: '',
        email: '',
        receives_notifications: true,
      },
    ])
  }

  const removeGuardian = (id: string) => {
    if (guardians.length <= 1) return
    setGuardians((prev) => prev.filter((g) => g.id !== id))
  }

  const updateGuardian = (id: string, field: keyof GuardianItem, value: any) => {
    setGuardians((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    )
  }

  // Primeiro responsável para inputs padrão
  const primary = guardians[0] || {}

  return (
    <div className="card-light p-6 space-y-6">
      {/* Campo oculto com JSON serializado de todos os responsáveis */}
      <input type="hidden" name="guardians_json" value={JSON.stringify(guardians)} />

      {/* Fallbacks para compatibilidade com actions existentes */}
      <input type="hidden" name="guardian_name" value={primary.name || ''} />
      <input type="hidden" name="relationship" value={primary.relationship || 'Mãe'} />
      <input type="hidden" name="guardian_cpf" value={primary.cpf || ''} />
      <input type="hidden" name="guardian_phone" value={primary.phone || ''} />
      <input type="hidden" name="guardian_email" value={primary.email || ''} />

      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-[#1A6B2E]/10 border border-[#1A6B2E]/20 flex items-center justify-center text-[#1A6B2E]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
              2. Responsáveis Legais pelo Atleta
            </h2>
            <p className="text-[11px] text-slate-500">
              Cadastre um ou mais responsáveis (Pai, Mãe, etc.) e defina quem recebe avisos no WhatsApp
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={addGuardian}
          className="px-3 py-1.5 bg-[#1A6B2E]/10 hover:bg-[#1A6B2E]/20 text-[#0D4A1C] border border-[#1A6B2E]/30 rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          + Adicionar Mais um Responsável
        </button>
      </div>

      {/* Lista de Responsáveis */}
      <div className="space-y-5">
        {guardians.map((g, index) => {
          const isPrimary = index === 0

          return (
            <div
              key={g.id}
              className={`p-4 rounded-[6px] border transition-all ${
                isPrimary
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-emerald-50/30 border-emerald-200/80'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1A6B2E] text-white text-[11px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {isPrimary ? 'Responsável Principal' : `Responsável Adicional #${index + 1}`}
                  </span>
                  {isPrimary && (
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold uppercase rounded">
                      Titular Financeiro
                    </span>
                  )}
                </div>

                {!isPrimary && (
                  <button
                    type="button"
                    onClick={() => removeGuardian(g.id)}
                    className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nome Completo do Responsável <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={g.name}
                    onChange={(e) => updateGuardian(g.id, 'name', e.target.value)}
                    placeholder="Ex: Maria Clara da Silva"
                    className="input-escolinha"
                  />
                </div>

                {/* Parentesco */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Grau de Parentesco <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={g.relationship}
                    onChange={(e) => updateGuardian(g.id, 'relationship', e.target.value)}
                    className="input-escolinha cursor-pointer"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó/Avô">Avó / Avô</option>
                    <option value="Tia/Tio">Tia / Tio</option>
                    <option value="Padrasto/Madrasta">Padrasto / Madrasta</option>
                    <option value="Responsável Legal">Responsável Legal</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Celular / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={g.phone}
                    onChange={(e) => updateGuardian(g.id, 'phone', e.target.value)}
                    placeholder="(81) 98888-7777"
                    className="input-escolinha font-mono"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    CPF do Responsável <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={g.cpf}
                    onChange={(e) => updateGuardian(g.id, 'cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className="input-escolinha font-mono"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={g.email}
                    onChange={(e) => updateGuardian(g.id, 'email', e.target.value)}
                    placeholder="responsavel@email.com"
                    className="input-escolinha"
                  />
                </div>

                {/* BOX SELECIONÁVEL: RECEBER MENSAGENS NO WHATSAPP */}
                <div className="sm:col-span-2 pt-1">
                  <label className={`flex items-start gap-3 p-3 rounded-[6px] border cursor-pointer select-none transition-all ${
                    g.receives_notifications
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={g.receives_notifications}
                      onChange={(e) => updateGuardian(g.id, 'receives_notifications', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#1A6B2E] accent-[#1A6B2E] cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Receber mensagens de cobrança e avisos no WhatsApp deste responsável</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {g.receives_notifications
                          ? '✅ Notificações de mensalidade, faltas e check-in de treino serão enviadas para este contato.'
                          : '⚪ Este contato NÃO receberá os disparos automáticos de cobrança e faltas.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
