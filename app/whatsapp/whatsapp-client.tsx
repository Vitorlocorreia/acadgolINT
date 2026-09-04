'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Zap,
  Bell,
  Utensils,
  Trophy,
  DollarSign,
  Loader2,
  LogOut,
  UserCheck,
  PhoneCall,
} from 'lucide-react'
import {
  checkWhatsAppStatusAction,
  getWhatsAppQRCodeAction,
  sendTestWhatsAppAction,
  disconnectWhatsAppAction,
} from './actions'

export function WhatsAppClient() {
  const [isPending, startTransition] = useTransition()
  const [isConnected, setIsConnected] = useState(false)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('Aguardando verificação...')
  const [demoMode, setDemoMode] = useState(false)
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null)
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)

  // Test form
  const [testPhone, setTestPhone] = useState('81985742015')
  const [testMessage, setTestMessage] = useState(
    '⚽ Olá! Esta é uma mensagem de teste da automação oficial da Academia do Gol via WhatsApp!'
  )
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Disparar verificação
  const handleCheckStatus = () => {
    startTransition(async () => {
      const res = await checkWhatsAppStatusAction()
      if (res.connected) {
        setIsConnected(true)
        if (res.ownerNumber) setConnectedNumber(res.ownerNumber)
        if (res.profilePictureUrl) setProfilePicUrl(res.profilePictureUrl)
        setStatusMessage('🟢 Conectado Oficialmente (WhatsApp da Academia do Gol)')
      } else {
        setIsConnected(false)
        setConnectedNumber(null)
        setProfilePicUrl(null)
        setStatusMessage('🔴 Desconectado — Escaneie o QR Code abaixo')
      }
    })
  }

  // Desconectar aparelho
  const handleDisconnect = () => {
    if (!confirm('Deseja realmente desconectar o número atual do WhatsApp?')) return
    startTransition(async () => {
      await disconnectWhatsAppAction()
      setIsConnected(false)
      setConnectedNumber(null)
      setProfilePicUrl(null)
      handleGenerateQR()
    })
  }

  // Gerar QR Code
  const handleGenerateQR = () => {
    startTransition(async () => {
      const res = await getWhatsAppQRCodeAction()
      if (res.base64) {
        setQrCodeBase64(res.base64)
      } else {
        // Fallback / demonstração
        setQrCodeBase64(
          'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ACADEMIADOGOL_WHATSAPP_DEMO_2026'
        )
      }
    })
  }

  // Carrega status e QR Code automaticamente ao abrir a tela
  useEffect(() => {
    handleCheckStatus()
    handleGenerateQR()
    const interval = setInterval(handleCheckStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  // Enviar teste
  const handleSendTest = () => {
    setTestFeedback(null)
    startTransition(async () => {
      const res = await sendTestWhatsAppAction(testPhone, testMessage)
      if (res.success) {
        setTestFeedback({
          type: 'success',
          message: `Mensagem enviada com sucesso para +55 ${testPhone}! ID: ${res.messageId || 'OK'}`,
        })
      } else {
        if (demoMode) {
          setTestFeedback({
            type: 'success',
            message: `[Demonstração]: Mensagem transmitida para a fila de envio de +55 ${testPhone} com sucesso!`,
          })
        } else {
          setTestFeedback({
            type: 'error',
            message: `Evolution API: ${res.error || 'Servidor offline'}`,
          })
        }
      }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header com Título e Toggle Demo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl sm:text-4xl tracking-wider leading-none flex items-center gap-2.5 text-[var(--text-primary)]">
            <Smartphone className="w-8 h-8 text-[#1A6B2E] dark:text-emerald-400" />
            Central de Automação WhatsApp
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Envio 100% automático de avisos de falta, extratos da cantina, convocações e cobrança PIX.
          </p>
        </div>

        {/* Toggle Modo Demo / Apresentação */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="accent-[#1A6B2E]"
            />
            <span className="text-slate-600 dark:text-slate-300">Modo Apresentação (Demo)</span>
          </label>
        </div>
      </div>

      {/* Grid Principal: QR Code (Esquerda) + Testador Imediato (Direita) lado a lado! */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Bloco 1: Conexão QR Code (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="card-app p-5 space-y-4 shadow-xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#1A6B2E] dark:text-emerald-400" />
                <h3 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider leading-none">
                  Aparelho Conectado
                </h3>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  demoMode || isConnected
                    ? 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {demoMode || isConnected ? '● Online & Conectado' : '○ Desconectado'}
              </span>
            </div>

            {/* Área do Aparelho: Conectado vs Desconectado */}
            {isConnected ? (
              <div className="flex flex-col items-center justify-center p-5 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] space-y-4">
                <div className="relative">
                  {profilePicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicUrl}
                      alt="Foto do WhatsApp Conectado"
                      className="w-20 h-20 rounded-full border-2 border-[#1A6B2E] shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#C8E6C9] dark:bg-emerald-950 flex items-center justify-center border-2 border-[#1A6B2E]">
                      <UserCheck className="w-10 h-10 text-[#1A6B2E] dark:text-emerald-400" />
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Número Ativo no Sistema
                  </p>
                  <p className="text-xl font-bebas tracking-widest text-[var(--text-primary)]">
                    {connectedNumber
                      ? connectedNumber
                          .replace(/^55(\d{2})(\d{1})(\d{4})(\d{4})$/, '+55 ($1) $2 $3-$4')
                          .replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3')
                      : '+55 (81) 98574-2015'}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Pronto para Disparos Automáticos
                  </div>
                </div>

                <div className="w-full pt-1 flex flex-col gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5 text-red-600" />
                    )}
                    Desconectar Aparelho
                  </button>

                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="w-full py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#1A6B2E] dark:text-emerald-400" />
                    Trocar / Conectar Outro Número
                  </button>
                </div>
              </div>
            ) : (
              /* QR Code Area Quando Desconectado */
              <div className="flex flex-col items-center justify-center p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] space-y-3">
                <div className="relative w-44 h-44 bg-white p-2.5 rounded-lg border shadow-xs flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      qrCodeBase64 ||
                      'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ACADEMIADOGOL_WHATSAPP_DEMO_2026'
                    }
                    alt="QR Code WhatsApp"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Como conectar o WhatsApp da Academia:
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No celular: <b>Aparelhos conectados ➔ Conectar um aparelho</b>
                  </p>
                </div>

                <button
                  onClick={handleGenerateQR}
                  disabled={isPending}
                  className="w-full py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#1A6B2E] dark:text-emerald-400" />
                  )}
                  Atualizar QR Code
                </button>
              </div>
            )}

            {/* Info de Segurança */}
            <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded border border-slate-200 dark:border-zinc-700 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1A6B2E] dark:text-emerald-400" />
                <span>Instância Própria Oracle Cloud (Docker)</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Sem intermediários. Custo por mensagem: <b>R$ 0,00</b>.
              </p>
            </div>
          </div>
        </div>

        {/* Bloco 2: Testador de Envio Imediato (7 cols) - EM DESTAQUE E 100% VISÍVEL! */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="card-app p-5 space-y-4 shadow-xs flex-1 flex flex-col justify-between border-[#1A6B2E]/30">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#1A6B2E] dark:text-emerald-400" />
                  <h3 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider leading-none">
                    Testar Envio Imediato
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-[#1A6B2E] dark:text-emerald-400 bg-[#C8E6C9]/40 px-2 py-0.5 rounded">
                  Demonstração ao Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Digite um número com DDD para receber a mensagem oficial da Academia do Gol em tempo real.
              </p>
            </div>

            {testFeedback && (
              <div
                className={`p-3 rounded text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
                  testFeedback.type === 'success'
                    ? 'bg-[#C8E6C9]/70 border-[#1A6B2E]/40 text-[#0D4A1C]'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1A6B2E] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{testFeedback.message}</span>
              </div>
            )}

            <div className="space-y-3.5 my-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Número de Telefone (com DDD)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ex: 81985742015"
                  className="input-app font-mono font-bold text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Mensagem que será enviada
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="input-app text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* BOTÃO GRANDE DE DISPARO - 100% DESTACADO E VISÍVEL! */}
            <div className="pt-2">
              <button
                onClick={handleSendTest}
                disabled={isPending}
                className="w-full py-3.5 bg-[#1A6B2E] hover:bg-[#0D4A1C] active:scale-98 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-[6px] font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Disparar Mensagem de Teste no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 3: Regras de Disparo Automático Ativas (12 cols na parte inferior) */}
      <div className="card-app p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider leading-none">
              Gatilhos Automáticos no Piloto Automático
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Mensagens disparadas pelo sistema sem intervenção humana
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Regra 1 */}
          <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>Aviso de Falta</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Ao dar falta na chamada beira de campo, o pai recebe o aviso de ausência imediatamente.
            </p>
          </div>

          {/* Regra 2 */}
          <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <Utensils className="w-4 h-4 text-purple-600" />
                <span>Extrato da Cantina</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Ao debitar o lanche do aluno, o responsável recebe os itens e o saldo restante no WhatsApp.
            </p>
          </div>

          {/* Regra 3 */}
          <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Convocações</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Disparo em massa para todos os pais dos atletas escalados com data, local e adversário.
            </p>
          </div>

          {/* Regra 4 */}
          <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <DollarSign className="w-4 h-4 text-[#1A6B2E]" />
                <span>Régua PIX</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Lembrete automático com chave PIX Copia e Cola às 09h para mensalidades a vencer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
