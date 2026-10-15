'use client'

import { ModalFrame } from '@/components/modal-frame'

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
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#c81930]" />
          <h3 className="section-title text-xl text-[var(--text-primary)] tracking-tight leading-tight">
            Responsáveis Legais ({list.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="button px-3 py-1 bg-[#c81930]/10 hover:bg-[#c81930]/20 text-[#c81930] border border-[#c81930]/30 rounded text-xs font-bold  tracking-normal flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
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
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">Nenhum responsável cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {list.map((g: any, idx: number) => {
            const receives = g.receives_notifications !== false
            const cleanPhone = g.phone ? g.phone.replace(/\D/g, '') : ''

            return (
              <div
                key={g.id || idx}
                className="p-3.5 rounded-lg border border-[var(--border-color)]/80 bg-[var(--bg-card-hover)]/50 space-y-2.5 text-xs hover:border-[var(--border-color)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                      <span>{g.name}</span>
                      <span className="px-2 py-0.2 rounded text-xs font-bold bg-slate-200 text-[var(--text-secondary)]">
                        {g.relationship}
                      </span>
                    </div>
                    {g.cpf && <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">CPF: {g.cpf}</div>}
                  </div>

                  {list.length > 1 && (
                    <button aria-label="Remover responsável"
                      type="button"
                      onClick={() => handleRemoveGuardian(g.id, g.name)}
                      className="button text-[var(--text-muted)] hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Remover responsável"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]/60">
                  {/* Telefone */}
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#c81930] hover:underline inline-flex items-center gap-1 font-mono text-xs"
                    >
                      <Phone className="w-3 h-3 text-[#c81930]" /> {g.phone}
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)] italic text-xs">Sem telefone</span>
                  )}

                  {/* Toggle Receber WhatsApp */}
                  <button aria-label="Clique para alternar se este responsável recebe mensagens automáticas de convocação e cobrança"
                    type="button"
                    onClick={() => handleToggleNotification(g.id, receives)}
                    disabled={isPending}
                    className={`button px-2.5 py-1 rounded text-xs font-bold  tracking-normal flex items-center gap-1.5 border transition-all cursor-pointer ${
                      receives
                        ? 'bg-[#c81930]/10 text-[#c81930] border-[#c81930]/30 hover:bg-[#c81930]/20 shadow-2xs'
                        : 'bg-slate-200 text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-slate-300'
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
        <ModalFrame label="Novo responsável" onClose={() => setShowAddModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-[10px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-[var(--border-color)]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#c81930]" />
                <h3 className="section-title  text-[var(--text-primary)] tracking-tight leading-tight">
                  Adicionar Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="button text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGuardian} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="field-appalunosidstudentguardianslisttsx-101" className="block font-bold text-[var(--text-secondary)]  mb-1">Nome Completo *</label>
                <input id="field-appalunosidstudentguardianslisttsx-101"
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
                  <label htmlFor="id-field-1" className="block font-bold text-[var(--text-secondary)]  mb-1">Parentesco</label>
                  <select id="id-field-1"
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
                  <label htmlFor="field-appalunosidstudentguardianslisttsx-102" className="block font-bold text-[var(--text-secondary)]  mb-1">WhatsApp / Telefone *</label>
                  <input id="field-appalunosidstudentguardianslisttsx-102"
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
                  <label htmlFor="field-appalunosidstudentguardianslisttsx-103" className="block font-bold text-[var(--text-secondary)]  mb-1">CPF (Opcional)</label>
                  <input id="field-appalunosidstudentguardianslisttsx-103"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="input-escolinha font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="field-appalunosidstudentguardianslisttsx-104" className="block font-bold text-[var(--text-secondary)]  mb-1">E-mail (Opcional)</label>
                  <input id="field-appalunosidstudentguardianslisttsx-104"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-escolinha"
                  />
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border-color)] flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">Receber WhatsApp</span>
                  <span className="text-xs text-[var(--text-muted)] block">
                    Receber notificações de convocação e cobrança
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={receivesNotifications}
                  onChange={(e) => setReceivesNotifications(e.target.checked)}
                  className="w-4 h-4 accent-[#c81930] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button px-4 py-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded text-xs font-bold  cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="button px-5 py-2 bg-gradient-to-r from-[#c81930] to-[#a71327] hover:from-[#c81930] hover:to-[#a71327] text-white rounded text-xs font-bold  flex items-center gap-1.5 shadow-sm border border-amber-400/30 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Salvar Responsável
                </button>
              </div>
            </form>
          </div>
        </ModalFrame>
      )}
    </div>
  )
}
