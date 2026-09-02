'use client'

import { useTheme } from './theme-provider'
import { Sun, Moon } from 'lucide-react'

interface Props {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = false }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`flex items-center gap-2 p-2 rounded-[6px] transition-all cursor-pointer border ${
        theme === 'dark'
          ? 'bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
      } ${className}`}
      title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0 animate-in spin-in-180 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 shrink-0 animate-in spin-in-180 duration-200" />
      )}
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-wider">
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
    </button>
  )
}
