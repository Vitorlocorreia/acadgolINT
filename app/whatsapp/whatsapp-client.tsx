'use client'

import { useEffect, useState, useTransition } from 'react'
import { Smartphone, QrCode, Send, RefreshCw, CheckCircle2, Loader2, LogOut, Bell, Trophy, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Dialog } from '@/components/dialog'
import {DeliveryConsole} from './delivery-console'
import { checkWhatsAppStatusAction, getWhatsAppQRCodeAction, sendTestWhatsAppAction, disconnectWhatsAppAction } from './actions'

export function WhatsAppClient() {
  const [pending, startTransition] = useTransition()
  const [connection, setConnection] = useState('checking')
  const [configured, setConfigured] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [number, setNumber] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Olá! Esta é uma mensagem de teste da Escolinha do Sport — Sport Club do Recife.')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)

  async function checkConnection() {
    try {
      const res = await checkWhatsAppStatusAction()
      setConnection(res.connected ? 'connected' : res.state)
      setConfigured(res.configured)
      setConnectionError(res.error || '')
      setNumber(res.ownerNumber || '')
      if (res.connected) setQr(null)
    } catch { setConnection('offline'); setConnectionError('Não foi possível verificar o serviço de WhatsApp. Tente novamente.') }
  }
  useEffect(() => {
    const initial=setTimeout(()=>void checkConnection(),0)
    const timer = setInterval(() => void checkConnection(), 15000)
    return () => {clearTimeout(initial);clearInterval(timer)}
  }, [])

  function generateQR() {
    setFeedback(null)
    setQr(null)
    startTransition(async () => {
      try {
        const res = await getWhatsAppQRCodeAction()
        if (res.connected) { await checkConnection(); setFeedback({ type: 'success', message: 'O WhatsApp já está conectado. Não é necessário parear novamente.' }) }
        else if (res.base64) { setQr(res.base64); setConnection('connecting'); setConnectionError('') }
        else setFeedback({ type: res.retryable ? 'info' : 'error', message: res.error || 'Não foi possível gerar o QR Code. Verifique o serviço e tente novamente.' })
      } catch { setFeedback({ type: 'error', message: 'O serviço de conexão não respondeu. Tente novamente.' }) }
    })
  }

  function sendTest() {
    setSendOpen(false)
    setFeedback(null)
    if (demo) {
      setFeedback({ type: 'success', message: 'Simulação concluída. Nenhuma mensagem foi enviada.' })
      return
    }
    startTransition(async () => {
      try {
        const res = await sendTestWhatsAppAction(phone, message)
        setFeedback(res.success ? { type: 'success', message: `Mensagem enviada para ${phone}.` } : { type: 'error', message: res.error || 'Não foi possível enviar. Confira o telefone e a conexão e tente novamente.' })
      } catch { setFeedback({ type: 'error', message: 'O envio não foi concluído. Tente novamente.' }) }
    })
  }

  const connected = connection === 'connected'
  const labels: Record<string,string> = { checking: 'Verificando…', not_configured: 'Configuração pendente', invalid_config: 'Revisar configuração', unauthorized: 'Chave recusada', not_found: 'Aparelho não pareado', offline: 'Serviço indisponível', busy: 'Serviço ocupado', connecting: 'Aguardando pareamento' }
  return <div className="page-container space-y-6">
    <PageHeader eyebrow="Perto de cada família" title="Comunicação" description="Conecte o WhatsApp da escolinha e confira o envio de mensagens." />
    {feedback && <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`notice ${feedback.type === 'success' ? 'notice-success' : feedback.type === 'info' ? 'notice-warning' : 'notice-error'}`}>{feedback.message}</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section className="surface overflow-hidden" aria-labelledby="connection-title">
        <div className="surface-heading flex-wrap">
          <div className="flex items-center gap-3"><Smartphone size={20} className="text-brand" /><h2 id="connection-title" className="section-title">Conexão do WhatsApp</h2></div>
          <span role="status" className={`badge ${connected ? 'badge-success' : 'badge-warning'}`}>{connected ? 'Conectado' : labels[connection] || 'Desconectado'}</span>
        </div>
        <div className="p-6 space-y-6">
          {connectionError && !connected && <p role="status" className="notice notice-warning">{connectionError}</p>}
          {connected ? <div className="empty-state !p-4">
            <CheckCircle2 size={40} className="!text-[var(--success)]" />
            <strong>Pronto para enviar mensagens</strong><p>{number || 'Aparelho conectado à escolinha.'}</p>
            <button className="button" onClick={() => setDisconnectOpen(true)} disabled={pending}><LogOut size={16} />Desconectar aparelho</button>
          </div> : <>
            {qr ? <div className="flex justify-center"><img src={qr} alt="QR Code para conectar o WhatsApp da escolinha" className="w-52 h-52 bg-white p-3 rounded-xl" /></div> : <div className="connection-placeholder"><QrCode size={44} /><span>Gere o QR Code para conectar um aparelho.</span></div>}
            <div>{['Abra o WhatsApp no celular da escolinha.', 'Acesse Aparelhos conectados e toque em Conectar aparelho.', 'Aponte a câmera para o QR Code desta tela.'].map((step, i) => <div key={step} className="communication-step"><span>{i + 1}</span><p>{step}</p></div>)}</div>
            <div className="flex flex-wrap gap-2">
              <button className="button button-primary" onClick={generateQR} disabled={pending || !configured || connection === 'checking'}>{pending ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}{qr ? 'Atualizar QR Code' : 'Gerar QR Code'}</button>
              <button className="button" onClick={() => startTransition(checkConnection)} disabled={pending}><RefreshCw size={16} />Verificar conexão</button>
            </div>
          </>}
        </div>
      </section>
      <section className="surface overflow-hidden" aria-labelledby="test-title">
        <div className="surface-heading"><div><h2 id="test-title" className="section-title">Testar uma mensagem</h2><p className="page-subtitle !text-sm">Confira o destinatário e o texto antes de enviar.</p></div><Send size={20} className="text-brand shrink-0" /></div>
        <form className="p-6 space-y-5" onSubmit={event => { event.preventDefault(); setSendOpen(true) }}>
          <label className="flex items-center gap-3 text-sm cursor-pointer min-h-11"><input type="checkbox" checked={demo} onChange={event => setDemo(event.target.checked)} />Simular envio, sem enviar mensagem</label>
          {demo && <p className="notice notice-warning">Modo de demonstração. Esta simulação não envia mensagens.</p>}
          <div><label htmlFor="test-phone" className="field-label">WhatsApp com DDD</label><input id="test-phone" type="tel" autoComplete="tel" required pattern="[+0-9() .-]{10,20}" value={phone} onChange={event => setPhone(event.target.value)} placeholder="(81) 99999-9999" className="field" /></div>
          <div><label htmlFor="test-message" className="field-label">Mensagem</label><textarea id="test-message" required rows={5} value={message} onChange={event => setMessage(event.target.value)} className="field resize-y" /></div>
          {!connected && !demo && <p className="text-sm text-[var(--text-muted)]">Conecte um aparelho para habilitar o envio.</p>}
          <button type="submit" className="button button-primary w-full" disabled={pending || (!connected && !demo)}>{pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{demo ? 'Simular mensagem' : 'Revisar envio'}</button>
        </form>
      </section>
    </div>
    <section className="surface overflow-hidden" aria-labelledby="messages-title">
      <div className="surface-heading"><div><h2 id="messages-title" className="section-title">Como os avisos são enviados</h2><p className="page-subtitle !text-sm">Os envios pelo sistema dependem da conexão e das preferências dos responsáveis.</p></div></div>
      <div className="grid md:grid-cols-3 gap-6 p-6">
        {[{ icon: Bell, title: 'Chamada: envio ao salvar', text: 'Faltas e presenças seguem as opções da revisão. Avisos já aceitos pelo WhatsApp são preservados ao salvar novamente. As tentativas ficam no histórico.' }, { icon: Trophy, title: 'Convocações: ação da equipe', text: 'A equipe anuncia a convocação. Repetir o lote preserva as imagens já enviadas. Falhas precisam de nova tentativa autorizada no histórico. Alterar os dados do jogo permite um novo aviso.' }, { icon: Wallet, title: 'Mensalidades: avisos configuráveis', text: 'Habilite abaixo os lembretes antes do vencimento e no início do mês seguinte. A rotina confere a cobrança e a preferência do responsável antes de enviar.' }].map(item => <div key={item.title}><item.icon size={20} className="text-brand mb-3" /><h3 className="font-semibold mb-2">{item.title}</h3><p className="text-sm text-[var(--text-secondary)]">{item.text}</p></div>)}
      </div>
      <div className="px-6 pb-6 text-sm text-[var(--text-secondary)] space-y-2"><p><strong>Aulas experimentais:</strong> habilite a confirmação e o lembrete na véspera. O responsável precisa autorizar os avisos no agendamento. Cancelamentos suspendem os envios pendentes.</p><p><strong>Matrícula e recebimentos:</strong> habilite abaixo as boas-vindas e a confirmação do valor recebido para novos registros.</p></div>
    </section>
    <DeliveryConsole/>
    <Dialog open={sendOpen} onClose={() => setSendOpen(false)} title={demo ? 'Simular mensagem' : 'Enviar mensagem de teste'} description={`Destinatário: ${phone}`}>
      <p className="notice whitespace-pre-wrap break-words">{message}</p><div className="flex justify-end flex-wrap gap-2"><button className="button" onClick={() => setSendOpen(false)}>Voltar</button><button className="button button-primary" disabled={pending} onClick={sendTest}>{demo ? 'Confirmar simulação' : 'Enviar mensagem'}</button></div>
    </Dialog>
    <Dialog open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Desconectar aparelho?" description="Os avisos por WhatsApp ficarão indisponíveis até que um aparelho seja conectado novamente.">
      <div className="flex justify-end flex-wrap gap-2"><button className="button" onClick={() => setDisconnectOpen(false)}>Cancelar</button><button className="button button-primary" disabled={pending} onClick={() => startTransition(async () => {
        try { const res = await disconnectWhatsAppAction(); if (res.success) { setConnection('disconnected'); setNumber(''); setQr(null); setDisconnectOpen(false) } else setFeedback({ type: 'error', message: res.error || 'Não foi possível desconectar o aparelho.' }) }
        catch { setFeedback({ type: 'error', message: 'O serviço não respondeu. Tente novamente.' }) }
      })}>Desconectar</button></div>
    </Dialog>
  </div>
}
