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
  Copy,
  Check,
} from 'lucide-react'
import {
  checkWhatsAppStatusAction,
  getWhatsAppQRCodeAction,
  sendTestWhatsAppAction,
} from './actions'

export function WhatsAppClient() {
  const [isPending, startTransition] = useTransition()
  const [isConnected, setIsConnected] = useState(false)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('Aguardando verificação...')
  const [demoMode, setDemoMode] = useState(true)

  // Test form
  const [testPhone, setTestPhone] = useState('81999999999')
  const [testMessage, setTestMessage] = useState(
    '⚽ Olá! Esta é uma mensagem de teste da automação oficial da Academia do Gol via WhatsApp!'
  )
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Carrega status e QR Code automaticamente ao abrir a tela
  useEffect(() => {
    handleCheckStatus()
    handleGenerateQR()
    const interval = setInterval(handleCheckStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  // Disparar verificação
  const handleCheckStatus = () => {
    startTransition(async () => {
      const res = await checkWhatsAppStatusAction()
      if (res.connected) {
        setIsConnected(true)
        setStatusMessage('🟢 Conectado Oficialmente (WhatsApp da Academia do Gol)')
      } else {
        setIsConnected(false)
        setStatusMessage('🔴 Desconectado — Escaneie o QR Code abaixo')
      }
    })
  }

  // Gerar QR Code
  const handleGenerateQR = () => {
    startTransition(async () => {
      const res = await getWhatsAppQRCodeAction()
      if (res.base64) {
        setQrCodeBase64(res.base64)
      } else {
        // Modo apresentação / demonstração
        setQrCodeBase64(
          'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ACADEMIADOGOL_WHATSAPP_DEMO_2026'
        )
      }
    })
  }

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
            message: `[Simulação de Demonstração]: Mensagem transmitida para a fila de envio de +55 ${testPhone} com sucesso!`,
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
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
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold cursor-pointer">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Conexão QR Code (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-app p-6 space-y-5 shadow-xs">
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

            {/* QR Code Area */}
            <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] space-y-4">
              <div className="relative w-56 h-56 bg-white p-3 rounded-lg border shadow-sm flex items-center justify-center">
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

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Como conectar o WhatsApp da Academia:
                </p>
                <ol className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 text-left list-decimal list-inside">
                  <li>Abra o WhatsApp no celular da escolinha</li>
                  <li>Toque em <b>Aparelhos conectados</b></li>
                  <li>Toque em <b>Conectar um aparelho</b> e aponte a câmera</li>
                </ol>
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={isPending}
                className="w-full py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#1A6B2E] dark:text-emerald-400" />
                )}
                Atualizar QR Code
              </button>
            </div>

            {/* Info de Segurança */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded border border-slate-200 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-[#1A6B2E] dark:text-emerald-400" />
                <span>Infraestrutura Própria & Segura</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Instância isolada rodando em Docker com criptografia de ponta a ponta. Custo por mensagem: <b>R$ 0,00</b>.
              </p>
            </div>
          </div>
        </div>

        {/* Painel Direito: Gatilhos Automáticos + Testador (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card dos 4 Gatilhos */}
          <div className="card-app p-6 space-y-4 shadow-xs">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider leading-none flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Regras de Disparo Automático Ativas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                O sistema envia essas mensagens no piloto automático sem intervenção humana
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Regra 1 */}
              <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span>Aviso de Falta na Chamada</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Quando o professor dá falta no campo, o pai recebe o aviso de ausência imediatamente.
                </p>
              </div>

              {/* Regra 2 */}
              <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                    <Utensils className="w-4 h-4 text-purple-600" />
                    <span>Extrato de Lanche da Cantina</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500">
                  A cada compra com a carteira digital, o pai recebe os itens consumidos e o saldo restante.
                </p>
              </div>

              {/* Regra 3 */}
              <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Convocações de Jogos</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Disparo em massa para todos os pais dos atletas escalados com data, local e adversário.
                </p>
              </div>

              {/* Regra 4 */}
              <div className="p-3.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                    <DollarSign className="w-4 h-4 text-[#1A6B2E]" />
                    <span>Régua de Cobrança PIX</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Lembrete automático com chave PIX Copia e Cola às 09h da manhã para mensalidades a vencer.
                </p>
              </div>
            </div>
          </div>

          {/* Testador ao Vivo */}
          <div className="card-app p-6 space-y-4 shadow-xs">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bebas text-2xl text-[var(--text-primary)] tracking-wider leading-none flex items-center gap-2">
                <Send className="w-5 h-5 text-[#1A6B2E] dark:text-emerald-400" />
                Testar Envio Imediato
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Faça uma demonstração ao vivo enviando uma mensagem para o seu celular
              </p>
            </div>

            {testFeedback && (
              <div
                className={`p-3.5 rounded text-xs font-bold flex items-center gap-2 border ${
                  testFeedback.type === 'success'
                    ? 'bg-[#C8E6C9]/60 border-[#1A6B2E]/30 text-[#0D4A1C]'
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

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Número de Telefone (com DDD)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ex: 81999998888"
                  className="input-app font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mensagem de Teste
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="input-app"
                />
              </div>

              <button
                onClick={handleSendTest}
                disabled={isPending}
                className="w-full py-3 bg-[#1A6B2E] hover:bg-[#0D4A1C] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Disparar Mensagem de Teste no WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
