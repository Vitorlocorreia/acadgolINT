'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Download, Sparkles, Trophy, Share2, CheckCircle2, Shield, Flame } from 'lucide-react'

export interface FifaCardProps {
  student: {
    name: string
    photo_url?: string | null
    preferred_position?: string
    dominant_foot?: string
    birth_date?: string
  }
  match?: {
    title?: string
    opponent?: string
    match_date?: string
    match_time?: string | null
    location?: string
    category_name?: string
  }
  evaluation?: {
    score_pass?: number
    score_shooting?: number
    score_dribble?: number
    score_control?: number
    score_marking?: number
    score_speed?: number
    score_stamina?: number
    score_discipline?: number
    score_teamwork?: number
  } | null
  interactive?: boolean
  edition?: 'sport_leao' | 'gold' | 'prime'
  className?: string
}

export function FifaCard({
  student,
  match,
  evaluation,
  interactive = true,
  edition = 'sport_leao',
  className = '',
}: FifaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 })
  const [isExporting, setIsExporting] = useState(false)

  // Determina Posição FIFA
  const posLower = (student.preferred_position || '').toLowerCase()
  const isGoalkeeper = posLower.includes('goleiro') || posLower.includes('gk')
  let positionCode = 'MEI'
  if (isGoalkeeper) positionCode = 'GOL'
  else if (posLower.includes('atacante') || posLower.includes('ponta')) positionCode = 'ATA'
  else if (posLower.includes('zagueiro')) positionCode = 'ZAG'
  else if (posLower.includes('lateral')) positionCode = 'LAT'
  else if (posLower.includes('volante')) positionCode = 'VOL'

  // Atributos calibrados (escala FIFA 84-96 para elevar a moral do atleta)
  const getStat = (evalScore: number | undefined, baseFallback: number) => {
    if (typeof evalScore === 'number' && evalScore > 0) {
      return Math.min(99, Math.max(82, Math.round(72 + evalScore * 2.6)))
    }
    return baseFallback
  }

  const stats = isGoalkeeper
    ? [
        { label: 'REF', val: getStat(evaluation?.score_control, 93), full: 'Reflexos' },
        { label: 'POS', val: getStat(evaluation?.score_marking, 90), full: 'Posição' },
        { label: 'MER', val: getStat(evaluation?.score_speed, 91), full: 'Mergulho' },
        { label: 'LAN', val: getStat(evaluation?.score_pass, 88), full: 'Lançamento' },
        { label: 'COM', val: getStat(evaluation?.score_teamwork, 92), full: 'Comando' },
        { label: 'VEL', val: getStat(evaluation?.score_stamina, 87), full: 'Velocidade' },
      ]
    : [
        { label: 'RIT', val: getStat(evaluation?.score_speed, 94), full: 'Ritmo' },
        { label: 'DRI', val: getStat(evaluation?.score_dribble, 92), full: 'Drible' },
        { label: 'CHU', val: getStat(evaluation?.score_shooting, 90), full: 'Chute' },
        { label: 'DEF', val: getStat(evaluation?.score_marking, 86), full: 'Defesa' },
        { label: 'PAS', val: getStat(evaluation?.score_pass, 91), full: 'Passe' },
        { label: 'FIS', val: getStat(evaluation?.score_stamina, 89), full: 'Físico' },
      ]

  const overall = Math.round(stats.reduce((acc, s) => acc + s.val, 0) / stats.length)

  // Primeiro e último nome para o card
  const nameParts = (student.name || 'LEÃO').trim().split(/\s+/)
  const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : nameParts[0]

  // Efeito 3D ao movimentar mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotX = ((y - centerY) / centerY) * -12
    const rotY = ((x - centerX) / centerX) * 12

    setRotateX(rotX)
    setRotateY(rotY)
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.38,
    })
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
    setGlarePos({ x: 50, y: 50, opacity: 0 })
  }

  // Efeito 3D para telas touch / mobile
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current || !e.touches[0]) return
    const touch = e.touches[0]
    const rect = cardRef.current.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotX = ((y - centerY) / centerY) * -12
    const rotY = ((x - centerX) / centerX) * 12

    setRotateX(rotX)
    setRotateY(rotY)
    setGlarePos({
      x: Math.max(0, Math.min(100, (x / rect.width) * 100)),
      y: Math.max(0, Math.min(100, (y / rect.height) * 100)),
      opacity: 0.38,
    })
  }

  const handleTouchEnd = () => {
    setRotateX(0)
    setRotateY(0)
    setGlarePos({ x: 50, y: 50, opacity: 0 })
  }

  // Exportador de imagem em alta resolução (1080x1500) via Canvas nativo
  const handleExportPng = () => {
    setIsExporting(true)
    const canvas = document.createElement('canvas')
    const width = 1080
    const height = 1500
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsExporting(false)
      return
    }

    // Fundo Gradiente Rubro-Negro com Textura Carbono
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#0A0A0C')
    bgGrad.addColorStop(0.35, '#8B0D12')
    bgGrad.addColorStop(0.7, '#D61F27')
    bgGrad.addColorStop(1, '#0A0A0C')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Listras Horizontais Rubro-Negras sutis de fundo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    for (let y = 160; y < height - 200; y += 100) {
      ctx.fillRect(40, y, width - 80, 50)
    }

    // Borda Externa Dourada de Campeão
    ctx.lineWidth = 26
    const borderGrad = ctx.createLinearGradient(0, 0, width, height)
    borderGrad.addColorStop(0, '#FFE899')
    borderGrad.addColorStop(0.3, '#F5A623')
    borderGrad.addColorStop(0.7, '#C28B00')
    borderGrad.addColorStop(1, '#FFF2B2')
    ctx.strokeStyle = borderGrad

    // Desenha escudo com cantos chanfrados
    ctx.beginPath()
    const pad = 40
    ctx.moveTo(pad + 80, pad)
    ctx.lineTo(width - pad - 80, pad)
    ctx.quadraticCurveTo(width - pad, pad, width - pad, pad + 80)
    ctx.lineTo(width - pad, height - pad - 200)
    ctx.lineTo(width / 2, height - pad)
    ctx.lineTo(pad, height - pad - 200)
    ctx.lineTo(pad, pad + 80)
    ctx.quadraticCurveTo(pad, pad, pad + 80, pad)
    ctx.closePath()
    ctx.stroke()

    // Estrelas Oficiais do Sport Club do Recife (2 Douradas 1987/2008 + 1 Prata 1990)
    ctx.font = '38px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFE300'
    ctx.fillText('★', width / 2 - 45, 95)
    ctx.fillText('★', width / 2 + 45, 95)
    ctx.fillStyle = '#D3D5D6'
    ctx.fillText('★', width / 2, 85)

    // Faixa Superior: SPORT RECIFE • ESCOLINHA DE FUTEBOL
    ctx.fillStyle = '#FFE899'
    ctx.font = 'bold 30px sans-serif'
    ctx.letterSpacing = '5px'
    ctx.fillText('SPORT CLUB DO RECIFE • LEÃO DA ILHA', width / 2, 140)

    // Overall e Posição (Lado Esquerdo Superior)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 135px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(overall), 230, 310)

    ctx.fillStyle = '#FFE300'
    ctx.font = 'bold 56px sans-serif'
    ctx.fillText(positionCode, 230, 380)

    // Escudo / Leão
    ctx.font = '50px sans-serif'
    ctx.fillText('🦁', 230, 460)

    // Função para desenhar a foto e textos
    const finishDrawing = (loadedImg?: HTMLImageElement, sportShieldImg?: HTMLImageElement) => {
      // Foto do Aluno
      if (loadedImg) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(650, 370, 230, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(loadedImg, 420, 140, 460, 460)
        ctx.restore()

        // Borda dourada na foto
        ctx.save()
        ctx.beginPath()
        ctx.arc(650, 370, 230, 0, Math.PI * 2)
        ctx.lineWidth = 14
        ctx.strokeStyle = '#FFE899'
        ctx.stroke()
        ctx.restore()
      } else {
        // Silhueta Rubro-Negra com inicial
        ctx.save()
        ctx.beginPath()
        ctx.arc(650, 370, 230, 0, Math.PI * 2)
        ctx.fillStyle = '#8B0D12'
        ctx.fill()
        ctx.lineWidth = 14
        ctx.strokeStyle = '#FFE899'
        ctx.stroke()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '900 180px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(displayName.charAt(0), 650, 430)
        ctx.restore()
      }

      // Se carregou o escudo do Sport, desenha no peito/topo
      if (sportShieldImg) {
        ctx.drawImage(sportShieldImg, 180, 490, 100, 130)
      }

      // Nome do Atleta (Grande e Centralizado)
      ctx.fillStyle = '#FFE899'
      ctx.font = '900 70px sans-serif'
      ctx.textAlign = 'center'
      ctx.letterSpacing = '4px'
      ctx.fillText(displayName.toUpperCase(), width / 2, 720)

      // Divisória Dourada
      ctx.beginPath()
      ctx.moveTo(150, 760)
      ctx.lineTo(width - 150, 760)
      ctx.lineWidth = 4
      ctx.strokeStyle = '#FFE899'
      ctx.stroke()

      // Grid de Atributos (3 Linhas x 2 Colunas)
      ctx.font = '900 58px sans-serif'
      const leftColX = 260
      const rightColX = 640
      const startY = 860
      const rowGap = 95

      stats.forEach((s, idx) => {
        const isLeft = idx % 2 === 0
        const rowIndex = Math.floor(idx / 2)
        const currentX = isLeft ? leftColX : rightColX
        const currentY = startY + rowIndex * rowGap

        // Valor
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'left'
        ctx.fillText(String(s.val), currentX, currentY)

        // Label
        ctx.fillStyle = '#FFE300'
        ctx.textAlign = 'left'
        ctx.fillText(s.label, currentX + 85, currentY)
      })

      // Faixa do Jogo / Convocação no Rodapé do Card
      if (match?.opponent) {
        ctx.fillStyle = '#141418'
        ctx.fillRect(100, 1170, width - 200, 180)
        ctx.lineWidth = 4
        ctx.strokeStyle = '#FFE899'
        ctx.strokeRect(100, 1170, width - 200, 180)

        ctx.fillStyle = '#FFE899'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.letterSpacing = '2px'
        ctx.fillText(`🦁 CONVOCADO: VS ${match.opponent.toUpperCase()}`, width / 2, 1230)

        ctx.fillStyle = '#FFFFFF'
        ctx.font = '30px sans-serif'
        const dateInfo = match.match_date ? match.match_date.split('-').reverse().join('/') : ''
        const timeInfo = match.match_time ? `às ${match.match_time.slice(0, 5)}` : ''
        ctx.fillText(`📅 ${dateInfo} ${timeInfo} — 📍 ${match.location || 'Ilha do Retiro / Arena'}`, width / 2, 1290)
      } else {
        ctx.fillStyle = '#FFE899'
        ctx.font = 'bold 34px sans-serif'
        ctx.textAlign = 'center'
        ctx.letterSpacing = '3px'
        ctx.fillText('★ CRAQUE RUBRO-NEGRO • SPORT RECIFE ★', width / 2, 1250)
      }

      // Converte para download PNG
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Card_FIFA_Sport_${displayName.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
      setIsExporting(false)
    }

    // Carrega escudo do Sport e foto do aluno
    const sportImg = new (window as any).Image()
    sportImg.src = '/sport-recife.svg'

    if (student.photo_url) {
      const img = new (window as any).Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => finishDrawing(img, sportImg)
      img.onerror = () => finishDrawing(undefined, sportImg)
      img.src = student.photo_url
    } else {
      sportImg.onload = () => finishDrawing(undefined, sportImg)
      sportImg.onerror = () => finishDrawing()
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* CARD 3D CONTAINER */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          perspective: '1000px',
        }}
        className="relative select-none cursor-pointer transition-transform duration-100 ease-out touch-manipulation"
      >
        {/* SHIELD DO CARD */}
        <div
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
          className="w-[290px] xs:w-[320px] sm:w-[340px] h-[470px] xs:h-[500px] sm:h-[520px] max-w-[calc(100vw-28px)] relative rounded-t-[36px] rounded-b-[4px] p-1.5 shadow-2xl transition-transform duration-75"
        >
          {/* Borda Dourada Metálica */}
          <div className="absolute inset-0 rounded-t-[36px] rounded-b-[4px] bg-gradient-to-b from-[#FFE899] via-[#F5A623] to-[#8B0D12] p-[3px] shadow-[0_15px_35px_rgba(214,31,39,0.4)]">
            
            {/* Camada Interna Rubro-Negra Oficial Sport Club do Recife */}
            <div className="w-full h-full rounded-t-[33px] rounded-b-[2px] bg-gradient-to-b from-[#0A0A0C] via-[#8B0D12] to-[#0A0A0C] relative overflow-hidden flex flex-col justify-between p-4 border border-[#FFE899]/50">
              
              {/* Listras Rubro-Negras Decorativas Sutis no Fundo */}
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(0deg,#D61F27,#D61F27_20px,#000_20px,#000_40px)]" />

              {/* Brilho Holográfico que se move com o mouse */}
              <div
                style={{
                  background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 235, 150, ${glarePos.opacity}) 0%, rgba(255, 255, 255, 0) 65%)`,
                }}
                className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-150"
              />

              {/* CABEÇALHO DO CARD: 3 Estrelas do Sport */}
              <div className="relative z-10 pt-1 flex items-center justify-center gap-1.5 drop-shadow-xs">
                <span className="text-[11px] text-[#FFE300] font-black">★</span>
                <span className="text-[13px] text-[#D3D5D6] font-black">★</span>
                <span className="text-[11px] text-[#FFE300] font-black">★</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-[#FFE899] ml-1">
                  SPORT RECIFE
                </span>
              </div>

              {/* SEÇÃO SUPERIOR: Overall, Posição, Escudo Sport & Foto */}
              <div className="relative z-10 pt-1 flex items-start justify-between">
                {/* Coluna Esquerda: OVR, Posição e Escudo Oficial */}
                <div className="flex flex-col items-center text-center space-y-0.5">
                  <div className="font-bebas text-5xl sm:text-6xl text-white tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {overall}
                  </div>
                  <div className="font-bebas text-2xl text-[#FFE300] tracking-wider leading-none drop-shadow-sm font-bold">
                    {positionCode}
                  </div>

                  {/* Escudo Oficial do Sport Club do Recife */}
                  <div className="relative w-8 h-10 mt-2 shrink-0 drop-shadow-md">
                    <Image
                      src="/sport-recife.svg"
                      alt="Sport Club do Recife"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Centro/Direita: Foto do Atleta com Faixa Leão */}
                <div className="relative flex-1 flex justify-center -mr-2">
                  <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-b-[20px] rounded-t-[10px] overflow-hidden relative flex items-center justify-center border-2 border-[#FFE899]/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)] bg-gradient-to-t from-black via-[#8B0D12] to-transparent">
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        <span className="font-bebas text-6xl text-white/90 drop-shadow-md">
                          {displayName.charAt(0)}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#FFE300]">
                          Leão da Ilha
                        </span>
                      </div>
                    )}

                    {/* Faixa Rubro-Negra na Foto */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent py-1 text-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#FFE300] flex items-center justify-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-[#D61F27]" />
                        <span>DNA RUBRO-NEGRO</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NOME DO ATLETA */}
              <div className="relative z-10 text-center my-1">
                <div className="inline-block px-4 py-0.5 bg-gradient-to-r from-transparent via-[#FFE899]/20 to-transparent border-y border-[#FFE899]/40 w-full">
                  <h2 className="font-bebas text-2xl sm:text-3xl text-white tracking-widest leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">
                    {displayName.toUpperCase()}
                  </h2>
                </div>
              </div>

              {/* GRID DE 6 ATRIBUTOS FIFA */}
              <div className="relative z-10 grid grid-cols-2 gap-x-6 gap-y-1.5 px-4 py-2 bg-black/60 rounded-[6px] border border-[#FFE899]/30 backdrop-blur-2xs shadow-inner">
                {stats.map((st) => (
                  <div key={st.label} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-sm text-white drop-shadow-xs">
                      {st.val}
                    </span>
                    <span className="font-bold text-[11px] text-[#FFE300] tracking-wider">
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* BANNER INFERIOR DO CONFRONTO / EDIÇÃO */}
              <div className="relative z-10 pt-1 text-center">
                {match?.opponent ? (
                  <div className="bg-[#D61F27] text-white border border-[#FFE300] rounded-[3px] py-1 px-2 font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 truncate">
                    <span>🦁</span>
                    <span className="truncate">VS {match.opponent}</span>
                  </div>
                ) : (
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#FFE300] flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FFE300]" />
                    <span>Edição Oficial Leão da Ilha</span>
                    <Sparkles className="w-3 h-3 text-[#FFE300]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO: BAIXAR FIGURINHA & COMPARTILHAR */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleExportPng}
          disabled={isExporting}
          className="px-4 py-2 bg-gradient-to-r from-[#D61F27] to-[#8B0D12] hover:from-[#A8131A] hover:to-[#6B080D] text-white font-bold rounded-[6px] text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border border-[#FFE300]/40"
        >
          <Download className="w-4 h-4 text-[#FFE300]" />
          <span>{isExporting ? 'Gerando Imagem...' : 'Baixar Card do Leão (PNG)'}</span>
        </button>

        {match?.opponent && (
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Convocação Oficial — ${displayName} (Sport Recife)`,
                  text: `Confira o Card FIFA oficial do atleta ${displayName} pelo Sport Club do Recife vs ${match.opponent}!`,
                  url: window.location.href,
                }).catch(() => {})
              } else {
                navigator.clipboard.writeText(window.location.href)
                alert('Link do card copiado para a área de transferência!')
              }
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-[6px] text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer border border-slate-700"
          >
            <Share2 className="w-4 h-4 text-[#FFE300]" />
            <span>Compartilhar</span>
          </button>
        )}
      </div>
    </div>
  )
}
