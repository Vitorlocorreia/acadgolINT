'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Shield,
  Award,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  Copy,
  Check,
  Trophy,
  Flame,
  Phone,
  Sparkles,
} from 'lucide-react'

interface Props {
  data: any
}

function fmt(val: number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calculateAge(birthDateStr: string) {
  if (!birthDateStr) return 0
  const birth = new Date(birthDateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function PortalClient({ data }: Props) {
  const { student, attendance, callups } = data
  const [activeTab, setActiveTab] = useState<'carteirinha' | 'financeiro' | 'jogos'>('carteirinha')
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null)

  const enrollment = Array.isArray(student.enrollment) ? student.enrollment[0] : student.enrollment
  const guardian = Array.isArray(student.guardian) ? student.guardian[0] : student.guardian
  const age = calculateAge(student.birth_date)

  const handleCopyPix = (pixCode: string, id: string) => {
    navigator.clipboard.writeText(pixCode)
    setCopiedPixId(id)
    setTimeout(() => setCopiedPixId(null), 3000)
  }

  // Fatura mais recente pendente
  const pendingInvoice = (student.invoices || []).find((i: any) => i.status === 'pending' || i.status === 'overdue')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header Institucional */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/logo.png"
                alt="Academia do Gol"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="font-bebas text-xl leading-none tracking-wider text-[#1A6B2E]">Academia do Gol</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#0D4A1C]">Portal do Responsável</p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-[#C8E6C9] text-[#0D4A1C] text-[10px] font-bold uppercase tracking-wider border border-[#1A6B2E]/20">
            {student.status === 'active' ? '● Aluno Ativo' : 'Inativo'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Banner Carteirinha Hero */}
        <div className="card-light p-6 relative overflow-hidden bg-gradient-to-r from-[#0D4A1C] via-[#1A6B2E] to-[#0D4A1C] border border-[#0D4A1C] text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-[8px] bg-white text-[#0D4A1C] border-2 border-white/80 flex items-center justify-center font-bebas text-4xl shadow-md shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#C8E6C9]">
                  Carteirinha Oficial do Atleta
                </span>
                <h2 className="font-bebas text-3xl tracking-wider leading-none">{student.name}</h2>
                <div className="text-xs text-[#C8E6C9] flex items-center justify-center sm:justify-start gap-2 flex-wrap font-medium">
                  <span>{age} anos</span>
                  <span>•</span>
                  <span>{student.preferred_position}</span>
                  <span>•</span>
                  <span>Pé: {student.dominant_foot}</span>
                </div>
              </div>
            </div>

            {/* Turma info */}
            {enrollment?.class && (
              <div className="p-3 bg-white/10 rounded-[6px] border border-white/20 text-xs space-y-0.5 text-center sm:text-right backdrop-blur-xs">
                <span className="text-[10px] font-bold uppercase text-[#C8E6C9] block">Turma</span>
                <span className="font-bold text-white block">{enrollment.class.name}</span>
                <span className="text-white/80 text-[11px] block">{enrollment.class.unit?.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lembrete de Mensalidade / PIX 1-Toque se houver pendente */}
        {pendingInvoice && (
          <div className="card-light p-4 border-[#1A6B2E] bg-[#C8E6C9]/30 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#1A6B2E]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Mensalidade de {pendingInvoice.reference_month} Disponível
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Vencimento: {pendingInvoice.due_date?.split('-').reverse().join('/')} • Valor: {fmt(pendingInvoice.amount)}
                  </p>
                </div>
              </div>
              <span className="font-bebas text-2xl text-[#1A6B2E] leading-none">
                {fmt(pendingInvoice.amount)}
              </span>
            </div>

            <button
              onClick={() => handleCopyPix(pendingInvoice.pix_code || '00020101021226830014br.gov.bcb.pix...', pendingInvoice.id)}
              className="w-full py-2.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {copiedPixId === pendingInvoice.id ? (
                <>
                  <Check className="w-4 h-4 text-[#C8E6C9]" /> Código PIX Copiado com Sucesso!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Código PIX para Pagar
                </>
              )}
            </button>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-slate-200 rounded-[6px] shadow-2xs">
          <button
            onClick={() => setActiveTab('carteirinha')}
            className={`py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'carteirinha'
                ? 'bg-[#1A6B2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frequência
          </button>
          <button
            onClick={() => setActiveTab('jogos')}
            className={`py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'jogos'
                ? 'bg-[#1A6B2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jogos & Convocações
          </button>
          <button
            onClick={() => setActiveTab('financeiro')}
            className={`py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'financeiro'
                ? 'bg-[#1A6B2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mensalidades
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: FREQUÊNCIA NOS TREINOS */}
        {activeTab === 'carteirinha' && (
          <div className="space-y-4">
            <div className="card-light p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#1A6B2E]" /> Presença nos Treinos Recentes
                </h3>
                <span className="text-xs font-mono font-bold text-[#1A6B2E]">
                  Últimas 10 aulas
                </span>
              </div>

              {attendance.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum registro de presença ainda.</p>
              ) : (
                <div className="space-y-2">
                  {attendance.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 rounded-[4px] border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono text-slate-800 font-bold">
                        <span>📅 {log.training_date?.split('-').reverse().join('/')}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        log.status === 'present'
                          ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                          : log.status === 'justified'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {log.status === 'present' ? '✓ Presente' : log.status === 'justified' ? 'Justificada' : 'Falta'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: JOGOS & CONVOCAÇÕES */}
        {activeTab === 'jogos' && (
          <div className="space-y-4">
            <div className="card-light p-5 space-y-4">
              <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" /> Próximos Jogos & Amistosos
              </h3>

              {callups.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum jogo ou torneio agendado no momento.</p>
              ) : (
                <div className="space-y-3">
                  {callups.map((c: any) => (
                    <div key={c.id} className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{c.match?.title} vs {c.match?.opponent}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#C8E6C9] text-[#0D4A1C]">
                          Convocado!
                        </span>
                      </div>
                      <p className="text-slate-600">
                        📍 Local: {c.match?.location} • 📅 {c.match?.match_date?.split('-').reverse().join('/')} às {c.match?.match_time?.slice(0, 5)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 4: MENSALIDADES */}
        {activeTab === 'financeiro' && (
          <div className="card-light p-5 space-y-4">
            <h3 className="font-bebas text-xl text-slate-900 tracking-wider leading-none flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#1A6B2E]" /> Histórico de Mensalidades
            </h3>

            <div className="space-y-2.5">
              {(student.invoices || []).map((inv: any) => {
                const isPaid = inv.status === 'paid'
                return (
                  <div
                    key={inv.id}
                    className="p-3.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono">
                        Mês: {inv.reference_month}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Vencimento: {inv.due_date?.split('-').reverse().join('/')} • {fmt(inv.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isPaid
                          ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isPaid ? '✓ Pago' : 'Pendente'}
                      </span>

                      {!isPaid && (
                        <button
                          onClick={() => handleCopyPix(inv.pix_code || '', inv.id)}
                          className="px-2.5 py-1 bg-[#1A6B2E] text-white rounded text-[11px] font-bold uppercase cursor-pointer"
                        >
                          {copiedPixId === inv.id ? 'Copiado!' : 'PIX'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
