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
  required?: boolean
}

export function StudentPhotoUpload({
  studentId,
  initialPhotoUrl = null,
  studentName = 'Atleta',
  preferredPosition,
  className = '',
  required = false,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [isCompressing, setIsCompressing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Comprime e redimensiona imagem para 480x480 no navegador
  const processImageFile = (file: File) => {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){setFeedback({type:'error',message:'Selecione uma foto JPG, PNG ou WebP de até 10 MB.'});fileInputRef.current?.setCustomValidity('Selecione uma foto válida do atleta.');return}
    fileInputRef.current?.setCustomValidity('Aguarde o processamento da foto antes de concluir a matrícula.')
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
          fileInputRef.current?.setCustomValidity('')

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
          fileInputRef.current?.setCustomValidity('Não foi possível preparar a foto. Escolha outro arquivo.')
        }
      }
      img.onerror = () => {
        setIsCompressing(false)
        fileInputRef.current?.setCustomValidity('Não foi possível abrir a foto. Escolha outro arquivo.')
        setFeedback({ type: 'error', message: 'Falha ao carregar a imagem.' })
      }
      img.src = e.target?.result as string
    }
    reader.onerror=()=>{setIsCompressing(false);setFeedback({type:'error',message:'Não foi possível ler a foto. Tente outro arquivo.'});fileInputRef.current?.setCustomValidity('Selecione outra foto.')}
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  const handleRemovePhoto = () => {
    const previousPhoto=photoUrl
    setPhotoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (studentId) {
      startTransition(async () => {
        try {
          const result=await updateStudentPhotoAction(studentId, '')
          if(result.success)setFeedback({ type: 'success', message: 'Foto removida.' })
          else {setPhotoUrl(previousPhoto);setFeedback({type:'error',message:result.error||'Não foi possível remover a foto.'})}
        }catch{setPhotoUrl(previousPhoto);setFeedback({type:'error',message:'Não foi possível remover a foto. Tente novamente.'})}
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
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        required={required&&!photoUrl}
        aria-label={required?'Foto obrigatória do atleta':'Foto do atleta'}
        disabled={isPending}
        className="sr-only"
      />

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Preview do Avatar / Card Preview */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-[var(--text-muted)]">
                <User className="w-9 h-9 mb-1" />
                <span className="text-xs font-medium">
                  Sem Foto
                </span>
              </div>
            )}

            {/* Overlay ao passar mouse */}
            <button type="button" aria-label="Alterar foto do atleta"
              disabled={isCompressing||isPending}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs cursor-pointer p-1 text-center"
            >
              <Camera className="w-5 h-5 mb-1 text-amber-300" />
              <span className="text-xs font-bold">Alterar Foto</span>
            </button>

            {isCompressing && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            )}
          </div>

          {photoUrl && (
            <button aria-label="Remover Foto"
              disabled={isCompressing||isPending}
              type="button"
              onClick={handleRemovePhoto}
              title="Remover Foto"
              className="button absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer border border-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Controles e Explicação */}
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold tracking-normal text-[var(--text-primary)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Foto do atleta {required&&<span className="text-red-600">*</span>}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Esta foto preenche automaticamente a <strong>arte de convocação</strong> e a carteirinha. Use uma foto vertical, nítida, de rosto ou meio-corpo. {required?'Obrigatória para concluir a matrícula.':''}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing || isPending}
              className="button px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold  tracking-normal flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{photoUrl ? 'Substituir Foto' : 'Tirar / Enviar Foto'}</span>
            </button>

            {photoUrl && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Foto pronta para o Card
              </span>
            )}
          </div>

          {feedback && (
            <div
              className={`text-xs font-bold p-1.5 rounded ${
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
