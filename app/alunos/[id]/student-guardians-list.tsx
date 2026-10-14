'use client'

import { useState, useTransition } from 'react'
import {
  Users,
  UserPlus,
  Phone,
  MessageSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  UserCheck,
} from 'lucide-react'
import {
  addGuardianToStudentAction,
  toggleGuardianNotificationAction,
  removeGuardianAction,
} from '../actions'

interface Props {
  studentId: string
  guardians: any[]
}

export function StudentGuardiansList({ studentId, guardians: initialGuardians }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Estado do formulário de novo responsável
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('Pai')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [receivesNotifications, setReceivesNotifications] = useState(true)

  const handleToggleNotification = (guardianId: string, currentVal: boolean) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await toggleGuardianNotificationAction(guardianId, !currentVal, studentId)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: !currentVal
            ? 'Contato agora RECEBERÁ mensagens e convocações no WhatsApp.'
            : 'Contato NÃO receberá mais mensagens automáticas de WhatsApp.',
        })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao alterar preferência.' })
      }
    })
  }

  const handleRemoveGuardian = (guardianId: string, guardianName: string) => {
    if (!confirm(`Tem certeza que deseja remover o responsável "${guardianName}"?`)) return
    setFeedback(null)
    startTransition(async () => {
      const res = await removeGuardianAction(guardianId, studentId)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Responsável removido com sucesso.' })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao remover responsável.' })
      }
    })
  }

  const handleAddGuardian = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    setFeedback(null)
    startTransition(async () => {
      const res = await addGuardianToStudentAction({
        studentId,
        name,
        relationship,
        cpf,
        phone,
        email,
        receivesNotifications,
      })

      if (res.success) {
        setFeedback({ type: 'success', message: `Responsável ${name} adicionado com sucesso!` })
        setShowAddModal(false)
        setName('')
        setPhone('')
        setCpf('')
        setEmail('')
        setReceivesNotifications(true)
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao adicionar responsável.' })
      }
    })
  }

  const list = Array.isArray(initialGuardians)
    ? initialGuardians
    : initialGuardians
    ? [initialGuardians]
    : []

  return (
    <div className="card-light p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#D61F27]" />
          <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none">
            Responsáveis Legais ({list.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-[#D61F27]/10 hover:bg-[#D61F27]/20 text-[#D61F27] border border-[#D61F27]/30 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          + Adicionar
        </button>
      </div>

      {feedback && (
        <div
          className={`p-2.5 rounded text-xs font-bold border flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">Nenhum responsável cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {list.map((g: any, idx: number) => {
            const receives = g.receives_notifications !== false
            const cleanPhone = g.phone ? g.phone.replace(/\D/g, '') : ''

            return (
              <div
                key={g.id || idx}
                className="p-3.5 rounded-[8px] border border-slate-200/80 bg-slate-50/50 space-y-2.5 text-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{g.name}</span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                        {g.relationship}
                      </span>
                    </div>
                    {g.cpf && <div className="text-[11px] text-slate-500 font-mono mt-0.5">CPF: {g.cpf}</div>}
                  </div>

                  {list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGuardian(g.id, g.name)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Remover responsável"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                  {/* Telefone */}
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#D61F27] hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <Phone className="w-3 h-3 text-[#D61F27]" /> {g.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Sem telefone</span>
                  )}

                  {/* Toggle Receber WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleToggleNotification(g.id, receives)}
                    disabled={isPending}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                      receives
                        ? 'bg-[#D61F27]/10 text-[#D61F27] border-[#D61F27]/30 hover:bg-[#D61F27]/20 shadow-2xs'
                        : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                    }`}
                    title="Clique para alternar se este responsável recebe mensagens automáticas de convocação e cobrança"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{receives ? 'Recebe WhatsApp' : 'Não Recebe'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Adicionar Novo Responsável */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#D61F27]" />
                <h3 className="font-bebas text-2xl text-slate-900 tracking-wider leading-none">
                  Adicionar Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGuardian} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-escolinha"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Parentesco</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="input-escolinha cursor-pointer"
                  >
                    <option value="Pai">Pai</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Tio(a)">Tio(a)</option>
                    <option value="Avô(ó)">Avô(ó)</option>
                    <option value="Padrasto/Madrasta">Padrasto/Madrasta</option>
                    <option value="Outro">Outro Responsável</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(81) 98888-7777"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-escolinha font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">CPF (Opcional)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="input-escolinha font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-escolinha"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block">Receber WhatsApp</span>
                  <span className="text-[11px] text-slate-500 block">
                    Receber notificações de convocação e cobrança
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={receivesNotifications}
                  onChange={(e) => setReceivesNotifications(e.target.checked)}
                  className="w-4 h-4 accent-[#D61F27] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm border border-amber-400/30 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Salvar Responsável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
