'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  ExternalLink,
  Eye,
  Star,
  MapPin,
  Clock,
  Shirt,
  User,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { FifaCard } from '@/components/fifa-card'

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
  const [viewingFifaCard, setViewingFifaCard] = useState<any | null>(null)

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
  const pendingInvoicesCount = (student.invoices || []).filter((i: any) => i.status === 'pending' || i.status === 'overdue').length

  // Estatísticas de Frequência para exibição no mobile
  const totalClasses = (attendance || []).length
  const presentClasses = (attendance || []).filter((a: any) => a.status === 'present').length
  const attendanceRate = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 pb-28 sm:pb-16 overflow-x-hidden selection:bg-[#D61F27] selection:text-white">
      {/* Header Mobile Sticky - Sport Club do Recife Oficial */}
      <header className="bg-[#0A0A0C]/95 border-b border-amber-400/20 backdrop-blur-md sticky top-0 z-30 shadow-lg px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Crest */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 drop-shadow-[0_0_10px_rgba(214,31,39,0.7)]">
              <Image
                src="/sport-recife.svg"
                alt="Sport Club do Recife"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-bebas text-lg sm:text-2xl leading-none tracking-wider text-white drop-shadow-sm truncate">
                  Sport Club do Recife
                </h1>
                <span className="text-[10px] sm:text-[11px] text-[#FFE300] font-black tracking-widest shrink-0">
                  ★ ★ ★
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-[#D61F27] flex items-center gap-1 mt-0.5 truncate">
                <span className="text-white/90">Escolinha Oficial</span>
                <span className="text-amber-400">•</span>
                <span className="text-amber-400/90">Portal do Responsável</span>
              </p>
            </div>
          </div>

          {/* Status Tag */}
          <div className="shrink-0">
            <span className="px-2 py-0.8 sm:px-2.5 sm:py-1 rounded-[4px] bg-[#D61F27]/20 border border-[#D61F27]/50 text-[#FFE300] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{student.status === 'active' ? 'Atleta Ativo' : student.status === 'paused' ? 'Trancado' : 'Inativo'}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* CARTEIRINHA DIGITAL HERO - SPORT CLUB DO RECIFE (Estilo Passe Digital) */}
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#140204] via-[#240407] to-[#0A0A0C] border-2 border-amber-400/40 p-4 sm:p-6 shadow-[0_8px_30px_rgba(214,31,39,0.3)]">
          {/* Efeitos de Iluminação e Atmosfera Ilha do Retiro */}
          <div className="absolute top-0 right-0 w-48 sm:w-72 h-48 sm:h-72 bg-[#D61F27]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 sm:w-56 h-36 sm:h-56 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 text-center sm:text-left relative z-10">
            {/* Bloco Foto e Informações Principais */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
              {/* Moldura da Foto */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[12px] bg-[#0A0A0C] border-2 border-[#FFE300] flex items-center justify-center font-bebas text-4xl shadow-[0_0_20px_rgba(255,227,0,0.35)] overflow-hidden text-amber-300">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-4xl text-[#FFE300]">{student.name.charAt(0)}</span>
                  )}
                </div>
                {/* 3 Estrelas do Sport sobre a foto */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#0A0A0C] px-2 py-0.5 rounded-full border border-amber-400/60 flex items-center gap-1 shadow-md">
                  <span className="text-[9px] text-[#FFE300]">★</span>
                  <span className="text-[10px] text-[#FFE300]">★</span>
                  <span className="text-[9px] text-[#D3D5D6]">★</span>
                </div>
              </div>

              {/* Nome e Dados do Atleta */}
              <div className="space-y-1.5 w-full sm:w-auto">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#D61F27]" />
                    Carteirinha Oficial do Atleta • Sport Recife
                  </span>
                </div>

                <h2 className="font-bebas text-2xl sm:text-4xl tracking-wider leading-none text-white drop-shadow-md">
                  {student.name}
                </h2>

                {/* Chips de Informações do Atleta */}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap pt-0.5">
                  <span className="px-2 py-0.5 rounded-[4px] bg-white/10 border border-white/20 text-white text-[11px] font-bold">
                    🎂 {age} anos
                  </span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#D61F27]/40 border border-[#D61F27]/60 text-amber-300 text-[11px] font-bold">
                    ⚽ {student.preferred_position || 'Atleta'}
                  </span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-black/40 border border-slate-700 text-slate-300 text-[11px]">
                    👟 {student.dominant_foot || 'Destro'}
                  </span>
                  {student.uniform_size && (
                    <span className="px-2 py-0.5 rounded-[4px] bg-amber-400/15 border border-amber-400/40 text-[#FFE300] text-[11px] font-mono font-bold">
                      🎽 Tam {student.uniform_size}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Turma Oficial Vinculada no Sport */}
            {enrollment?.class && (
              <div className="w-full sm:w-auto p-3 sm:p-3.5 bg-black/50 rounded-[10px] border border-amber-400/30 text-xs space-y-1 text-center sm:text-right backdrop-blur-md shrink-0 sm:min-w-[190px]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 block">
                  Turma Oficial do Sport
                </span>
                <span className="font-bold text-white block text-sm sm:text-base">{enrollment.class.name}</span>
                <span className="text-slate-300 text-[11px] block">📍 {enrollment.class.unit?.name}</span>
                <span className="text-slate-400 text-[10px] block">
                  Prof: {enrollment.class.coach?.name || 'Treinador'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* LEMBRETE DE MENSALIDADE / PIX 1-TOQUE (Mobile-First Touch Target) */}
        {pendingInvoice && (
          <div className="relative overflow-hidden rounded-[12px] bg-gradient-to-r from-[#1A0305] via-[#2A0507] to-[#1A0305] border-2 border-[#D61F27] p-3.5 sm:p-4 space-y-3 shadow-[0_4px_20px_rgba(214,31,39,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#D61F27]/30 border border-[#D61F27] flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-[#FFE300]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                    <span>Mensalidade {pendingInvoice.reference_month}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-[#FFE300] text-[9px] font-mono font-bold">
                      PIX 1-Toque
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    Vencimento: {pendingInvoice.due_date?.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bebas text-2xl sm:text-3xl text-[#FFE300] leading-none drop-shadow-xs block">
                  {fmt(pendingInvoice.amount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyPix(pendingInvoice.pix_code || '00020101021226830014br.gov.bcb.pix...', pendingInvoice.id)}
              className="w-full min-h-[48px] py-3 px-4 bg-gradient-to-r from-[#D61F27] via-[#B8141B] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] active:scale-[0.98] text-white rounded-[8px] text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md border border-amber-400/40 touch-manipulation"
            >
              {copiedPixId === pendingInvoice.id ? (
                <>
                  <Check className="w-5 h-5 text-[#FFE300] shrink-0" />
                  <span className="text-[#FFE300]">Código PIX Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#FFE300] shrink-0" />
                  <span>Copiar Código PIX para Pagar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* SEGMENTED CONTROL / ABAS SUPERIORES */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0F0F13] border border-slate-800 rounded-[10px] shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('carteirinha')}
            className={`min-h-[44px] py-2.5 px-2 rounded-[8px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation ${
              activeTab === 'carteirinha'
                ? 'bg-gradient-to-r from-[#D61F27] to-[#8B0D12] text-white border-b-2 border-[#FFE300] shadow-[0_2px_10px_rgba(214,31,39,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="truncate">Presença</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jogos')}
            className={`min-h-[44px] py-2.5 px-2 rounded-[8px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation ${
              activeTab === 'jogos'
                ? 'bg-gradient-to-r from-[#D61F27] to-[#8B0D12] text-white border-b-2 border-[#FFE300] shadow-[0_2px_10px_rgba(214,31,39,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span className="truncate">Jogos & FUT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`min-h-[44px] py-2.5 px-2 rounded-[8px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 relative touch-manipulation ${
              activeTab === 'financeiro'
                ? 'bg-gradient-to-r from-[#D61F27] to-[#8B0D12] text-white border-b-2 border-[#FFE300] shadow-[0_2px_10px_rgba(214,31,39,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="truncate">Mensalidades</span>
            {pendingInvoicesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#FFE300] absolute top-2 right-2 animate-ping" />
            )}
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: FREQUÊNCIA NOS TREINOS */}
        {activeTab === 'carteirinha' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Cartões Rápidos de KPI de Frequência para Mobile */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#0F0F13] border border-slate-800 rounded-[8px] text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Frequência</span>
                <span className="font-bebas text-xl sm:text-2xl text-amber-400 leading-none mt-1 block">
                  {attendanceRate}%
                </span>
              </div>
              <div className="p-3 bg-[#0F0F13] border border-slate-800 rounded-[8px] text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Presenças</span>
                <span className="font-bebas text-xl sm:text-2xl text-emerald-400 leading-none mt-1 block">
                  {presentClasses}
                </span>
              </div>
              <div className="p-3 bg-[#0F0F13] border border-slate-800 rounded-[8px] text-center">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Aulas Registradas</span>
                <span className="font-bebas text-xl sm:text-2xl text-white leading-none mt-1 block">
                  {totalClasses}
                </span>
              </div>
            </div>

            {/* Lista de Registros */}
            <div className="bg-[#0F0F13] border border-slate-800 rounded-[12px] p-4 sm:p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="font-bebas text-lg sm:text-xl text-white tracking-wider leading-none flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#D61F27]" />
                  <span>Histórico de Chamada nos Treinos</span>
                </h3>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Últimos treinos
                </span>
              </div>

              {attendance.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Nenhum treino registrado até o momento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendance.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 bg-[#16161D] rounded-[8px] border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 font-mono text-slate-200 font-bold">
                        <span className="text-base">📅</span>
                        <div>
                          <span>{log.training_date?.split('-').reverse().join('/')}</span>
                          <span className="text-[10px] text-slate-500 font-normal block">Treino Oficial</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${
                        log.status === 'present'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : log.status === 'justified'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-red-950/80 text-red-300 border-red-500/40'
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

        {/* CONTEÚDO DA ABA 2: JOGOS & CONVOCAÇÕES + CARDS FIFA FUT */}
        {activeTab === 'jogos' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-[#0F0F13] border border-slate-800 rounded-[12px] p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="font-bebas text-lg sm:text-xl text-white tracking-wider leading-none flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#FFE300]" />
                  <span>Jogos & Convocações Oficiais</span>
                </h3>
                <span className="text-[10px] sm:text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                  ★ Edição Leão
                </span>
              </div>

              {callups.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">Nenhum jogo ou torneio agendado no momento.</p>
                  <p className="text-[11px] text-slate-500">Assim que o atleta for convocado, o Card FIFA 3D aparecerá aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callups.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3.5 sm:p-4 bg-[#16161D] rounded-[10px] border border-slate-800 space-y-3 text-xs hover:border-amber-400/40 transition-all shadow-xs"
                    >
                      {/* Linha de Título e Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-wider">
                            Partida Oficial
                          </span>
                          <span className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#D61F27]">⚽</span>
                            <span>{c.match?.title} vs {c.match?.opponent}</span>
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.8 rounded-[4px] text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          c.status === 'confirmed'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}>
                          {c.status === 'confirmed' ? '✅ Confirmado' : '⏳ Convocado'}
                        </span>
                      </div>

                      {/* Dados do Jogo (Data e Local) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-400 text-[11px] bg-black/30 p-2.5 rounded-[6px] border border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#FFE300] shrink-0" />
                          <span>
                            {c.match?.match_date?.split('-').reverse().join('/')} às {c.match?.match_time?.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#D61F27] shrink-0" />
                          <span className="truncate">{c.match?.location}</span>
                        </div>
                      </div>

                      {/* Botões de Ação Mobile-Friendly */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {c.status === 'confirmed'
                            ? 'Presença garantida no jogo!'
                            : 'Confirme a presença do atleta:'}
                        </span>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingFifaCard({ callup: c })}
                            className="min-h-[42px] px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white rounded-[6px] text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Card 3D</span>
                          </button>

                          <Link
                            href={`/convocacao/${c.id}`}
                            target="_blank"
                            className="min-h-[42px] px-3 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] active:scale-[0.98] text-white font-bold rounded-[6px] text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-sm border border-amber-400/40 transition-all touch-manipulation"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FFE300]" />
                            <span>Página Completa</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: MENSALIDADES (Cards Móveis) */}
        {activeTab === 'financeiro' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-[#0F0F13] border border-slate-800 rounded-[12px] p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="font-bebas text-lg sm:text-xl text-white tracking-wider leading-none flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#D61F27]" />
                  <span>Mensalidades & Histórico Financeiro</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {student.invoices?.length || 0} faturas
                </span>
              </div>

              {(student.invoices || []).length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-bold">Nenhuma fatura pendente.</p>
                  <p className="text-[11px] text-slate-500">Todas as mensalidades estão regularizadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(student.invoices || []).map((inv: any) => {
                    const isPaid = inv.status === 'paid'
                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 sm:p-4 bg-[#16161D] rounded-[10px] border border-slate-800 space-y-3 hover:border-slate-700 transition-colors shadow-xs"
                      >
                        {/* Linha de Referência e Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                              Mês de Referência
                            </span>
                            <span className="font-bold text-white font-mono text-sm sm:text-base">
                              {inv.reference_month}
                            </span>
                          </div>

                          <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            {isPaid ? '✓ Pago' : 'Pendente'}
                          </span>
                        </div>

                        {/* Dados de Vencimento e Valor */}
                        <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-[6px] border border-slate-800/80 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Vencimento</span>
                            <span className="font-mono text-slate-200">
                              {inv.due_date?.split('-').reverse().join('/')}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Valor</span>
                            <span className="font-bebas text-xl sm:text-2xl text-[#FFE300] leading-none">
                              {fmt(inv.amount)}
                            </span>
                          </div>
                        </div>

                        {/* Botão de Pagamento 1-Toque */}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => handleCopyPix(inv.pix_code || '00020101021226830014br.gov.bcb.pix...', inv.id)}
                            className="w-full min-h-[44px] py-2.5 px-3 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#E5232B] hover:to-[#A31016] active:scale-[0.98] text-white rounded-[6px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-amber-400/40 transition-all shadow-xs touch-manipulation"
                          >
                            {copiedPixId === inv.id ? (
                              <>
                                <Check className="w-4 h-4 text-[#FFE300]" />
                                <span className="text-[#FFE300]">Código PIX Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-[#FFE300]" />
                                <span>Copiar Código PIX ({fmt(inv.amount)})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL RESPONSIVO DO CARD FIFA 3D */}
        {viewingFifaCard && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-[#0A0A0C] text-white rounded-[14px] p-4 sm:p-6 max-w-md w-full space-y-3.5 border border-amber-400/40 relative my-auto shadow-2xl flex flex-col items-center">
              {/* Botão Fechar no Topo Direita */}
              <button
                type="button"
                onClick={() => setViewingFifaCard(null)}
                className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fechar modal"
              >
                ✕
              </button>

              <div className="text-center space-y-0.5 pt-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  ★ Sport Club do Recife FUT Edition ★
                </span>
                <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wider">
                  Card Oficial de Convocado
                </h3>
              </div>

              {/* Componente Card FIFA 3D com touch manipulation */}
              <div className="w-full flex justify-center py-1">
                <FifaCard
                  student={{
                    name: student.name,
                    photo_url: student.photo_url,
                    preferred_position: student.preferred_position,
                    dominant_foot: student.dominant_foot,
                  }}
                  match={{
                    title: viewingFifaCard.callup?.match?.title,
                    opponent: viewingFifaCard.callup?.match?.opponent,
                    match_date: viewingFifaCard.callup?.match?.match_date,
                    match_time: viewingFifaCard.callup?.match?.match_time,
                    location: viewingFifaCard.callup?.match?.location,
                    category_name: viewingFifaCard.callup?.match?.category?.name,
                  }}
                  interactive={true}
                />
              </div>

              <div className="pt-2 w-full flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingFifaCard(null)}
                  className="min-h-[40px] px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-[6px] text-xs font-bold uppercase cursor-pointer"
                >
                  Fechar
                </button>
                <Link
                  href={`/convocacao/${viewingFifaCard.callup?.id}`}
                  target="_blank"
                  className="min-h-[40px] px-4 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] text-white rounded-[6px] text-xs font-bold uppercase tracking-wider border border-amber-400/40 inline-flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#FFE300]" />
                  <span>Baixar em Alta Resolução</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RODAPÉ OFICIAL SPORT CLUB DO RECIFE */}
      <footer className="text-center text-xs text-slate-500 pt-6 pb-20 sm:pb-8 px-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="relative w-5 h-5 shrink-0">
            <Image
              src="/sport-recife.svg"
              alt="Sport Club do Recife"
              fill
              className="object-contain opacity-80"
            />
          </div>
          <p className="font-bebas tracking-wider text-slate-300 text-base">
            Sport Club do Recife • Escolinha Oficial de Futebol
          </p>
        </div>
        <p className="text-[10px] sm:text-[11px] text-[#FFE300]/90 font-bold tracking-widest uppercase">
          ★ ★ ★ Pelo Sport Tudo! ★ ★ ★
        </p>
      </footer>

      {/* BARRA INFERIOR FIXA PARA NAVEGAÇÃO MOBILE (Estilo App Nativo iOS / Android) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-lg border-t border-amber-400/20 py-1.5 px-3 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('carteirinha')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-all touch-manipulation ${
            activeTab === 'carteirinha'
              ? 'text-[#FFE300]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Presença</span>
          {activeTab === 'carteirinha' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE300] -mt-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jogos')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-all touch-manipulation ${
            activeTab === 'jogos'
              ? 'text-[#FFE300]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Jogos</span>
          {activeTab === 'jogos' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE300] -mt-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-all relative touch-manipulation ${
            activeTab === 'financeiro'
              ? 'text-[#FFE300]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">PIX / Faturas</span>
          {activeTab === 'financeiro' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE300] -mt-0.5" />
          )}
          {pendingInvoicesCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D61F27] absolute top-1 right-3" />
          )}
        </button>
      </nav>
    </div>
  )
}
