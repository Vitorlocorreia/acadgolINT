'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CheckSquare,
  DollarSign,
  Target,
  Trophy,
  Shirt,
  ShieldCheck,
  Smartphone,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

const navItems = [
  {
    href: '/dashboard',
    label: 'Visão Geral',
    icon: LayoutDashboard,
  },
  {
    href: '/alunos',
    label: 'Alunos & Atletas',
    icon: Users,
  },
  {
    href: '/turmas',
    label: 'Turmas & Grade',
    icon: CalendarDays,
  },
  {
    href: '/chamada',
    label: 'Chamada na Quadra',
    icon: CheckSquare,
    badge: 'Campo',
    badgeColor: 'bg-red-500/10 text-[#D61F27] border-red-500/30',
  },
  {
    href: '/jogos',
    label: 'Jogos & Convocações',
    icon: Trophy,
    badge: 'FUT',
    badgeColor: 'bg-[#FFE300] text-black font-extrabold border-amber-400',
  },
  {
    href: '/uniformes',
    label: 'Estoque de Uniformes',
    icon: Shirt,
  },
  {
    href: '/financeiro',
    label: 'Mensalidades & PIX',
    icon: DollarSign,
  },
  {
    href: '/experimentais',
    label: 'Aulas Experimentais',
    icon: Target,
    badge: 'Leads',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    href: '/whatsapp',
    label: 'WhatsApp Robô',
    icon: Smartphone,
    badge: 'Auto',
    badgeColor: 'bg-red-500/10 text-[#D61F27] border-red-500/30',
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ignora o AppShell no portal público do responsável e na página pública de convocação
  const isPortal = pathname.startsWith('/portal') || pathname.startsWith('/convocacao')

  useEffect(() => {
    const saved = localStorage.getItem('acadgol_sidebar_collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('acadgol_sidebar_collapsed', String(next))
  }

  if (isPortal) {
    return <>{children}</>
  }

  const currentItem = navItems.find((item) =>
    item.href === '/dashboard'
      ? pathname === '/' || pathname === '/dashboard'
      : pathname.startsWith(item.href)
  )

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-50 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 shrink-0">
            <Image
              src="/logo.png"
              alt="Academia do Gol"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700"></div>
          <div className="relative w-6 h-8 shrink-0 drop-shadow-xs">
            <Image
              src="/sport-recife.svg"
              alt="Sport Club do Recife"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="font-bebas text-lg leading-none tracking-wider text-[#D61F27]">
                Academia do Gol
              </h1>
              <span className="text-[9px] text-[#F5A623]">★ ★ ★</span>
            </div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
              DNA Rubro-Negro • Leão da Ilha
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ease-in-out lg:static shadow-2xs ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}`}
      >
        {/* Header da Sidebar com Escudos Combinados */}
        <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between min-h-[72px]">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative w-9 h-9 shrink-0 drop-shadow-xs">
                <Image
                  src="/logo.png"
                  alt="Logo Academia do Gol"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-700"></div>
              <div className="relative w-7 h-9 shrink-0 drop-shadow-xs">
                <Image
                  src="/sport-recife.svg"
                  alt="Sport Club do Recife"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bebas text-lg leading-none tracking-wider text-[#D61F27] truncate">
                    ACADEMIA DO GOL
                  </h2>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-[#F5A623]">★ ★ ★</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 truncate">
                    Leão da Ilha
                  </span>
                </div>
              </div>
            )}
          </Link>

          {/* Botão de Fechar / Abrir Sidebar no Desktop */}
          <button
            onClick={toggleSidebar}
            type="button"
            className="hidden lg:flex p-1.5 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#D61F27]" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Faixa Rubro-Negra Decorativa */}
        <div className="h-1 w-full bg-gradient-to-r from-[#D61F27] via-[#8B0D12] to-[#FFE300]"></div>

        {/* Itens de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Menu Principal</span>
              <span className="text-[9px] text-[#D61F27] font-bold">DNA Rubro-Negro</span>
            </div>
          )}

          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } py-2.5 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D61F27] to-[#8B0D12] text-white shadow-sm border-l-4 border-[#FFE300]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-red-500/10 hover:text-[#D61F27] dark:hover:text-[#D61F27]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#D61F27]'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-[var(--border-color)]">
          {!isCollapsed && (
            <div className="p-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#D61F27]" />
                  <span>Pelo Sport Tudo!</span>
                </span>
                <span className="text-[10px] text-[#F5A623]">★ ★ ★</span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono">Sport Recife • 1987 | 2008</p>
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Conteúdo Principal com Top Navigation Bar no Desktop */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3.5 bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              title={isCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-[#D61F27]" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span className="text-[#D61F27] font-bold">Academia do Gol</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--text-primary)] font-bold">
                {currentItem?.label || 'Painel de Controle'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-[4px] bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-[#D61F27] dark:text-red-400 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#D61F27] animate-pulse"></span>
              <span>Leão da Ilha • Temporada 2026</span>
              <span className="text-[#F5A623]">★ ★ ★</span>
            </div>

            <ThemeToggle />
          </div>
        </div>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
