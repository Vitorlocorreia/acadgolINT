'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Camera, Upload, X, Check, Loader2, Sparkles, User } from 'lucide-react'
import { updateStudentPhotoAction } from './actions'

interface Props {
  studentId?: string // Se fornecido, salva direto via Server Action
  initialPhotoUrl?: string | null
  studentName?: string
  preferredPosition?: string
  className?: string
}

export function StudentPhotoUpload({
  studentId,
  initialPhotoUrl = null,
  studentName = 'Atleta',
  preferredPosition,
  className = '',
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [isCompressing, setIsCompressing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Comprime e redimensiona imagem para 480x480 no navegador
  const processImageFile = (file: File) => {
    setIsCompressing(true)
    setFeedback(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new (window as any).Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 480
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          // Qualidade 0.85 em JPEG para manter leve e nítido
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          setPhotoUrl(compressedDataUrl)
          setIsCompressing(false)

          // Se estiver na tela de perfil do aluno (tem studentId), salva automaticamente
          if (studentId) {
            startTransition(async () => {
              const res = await updateStudentPhotoAction(studentId, compressedDataUrl)
              if (res.success) {
                setFeedback({ type: 'success', message: 'Foto do atleta salva com sucesso!' })
              } else {
                setFeedback({ type: 'error', message: res.error || 'Erro ao salvar foto.' })
              }
            })
          }
        } else {
          setIsCompressing(false)
        }
      }
      img.onerror = () => {
        setIsCompressing(false)
        setFeedback({ type: 'error', message: 'Falha ao carregar a imagem.' })
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (studentId) {
      startTransition(async () => {
        await updateStudentPhotoAction(studentId, '')
        setFeedback({ type: 'success', message: 'Foto removida.' })
      })
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden input para ser submetido junto com o formulário pai (caso seja em /alunos/novo) */}
      <input type="hidden" name="photo_url" value={photoUrl || ''} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview do Avatar / Card Preview */}
        <div className="relative group">
          <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-[8px] bg-gradient-to-b from-amber-500/20 via-slate-900 to-black border-2 border-amber-400/60 shadow-md flex items-center justify-center overflow-hidden relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                <User className="w-10 h-10 text-amber-300/60 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                  Sem Foto
                </span>
              </div>
            )}

            {/* Badge Estilo FIFA */}
            <div className="absolute top-1 left-1 bg-amber-400 text-slate-950 font-extrabold text-[9px] px-1 py-0.2 rounded shadow-xs">
              FUT
            </div>

            {/* Overlay ao passar mouse */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs cursor-pointer p-1 text-center"
            >
              <Camera className="w-5 h-5 mb-1 text-amber-300" />
              <span className="text-[10px] font-bold">Alterar Foto</span>
            </div>

            {isCompressing && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            )}
          </div>

          {photoUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              title="Remover Foto"
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer border border-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Controles e Explicação */}
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Foto Oficial do Atleta (Card FIFA)
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Esta foto será usada no <strong>Card de Convocação estilo FIFA</strong> e na carteirinha digital do aluno. Escolha uma foto nítida de rosto ou meio-corpo.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing || isPending}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{photoUrl ? 'Substituir Foto' : 'Tirar / Enviar Foto'}</span>
            </button>

            {photoUrl && (
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Foto pronta para o Card
              </span>
            )}
          </div>

          {feedback && (
            <div
              className={`text-[11px] font-bold p-1.5 rounded ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
