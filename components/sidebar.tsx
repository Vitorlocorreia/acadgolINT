'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CheckSquare,
  DollarSign,
  Award,
  Target,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

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
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    href: '/financeiro',
    label: 'Mensalidades & PIX',
    icon: DollarSign,
  },
  {
    href: '/avaliacoes',
    label: 'Boletim do Atleta (Scout)',
    icon: Award,
  },
  {
    href: '/experimentais',
    label: 'Aulas Experimentais',
    icon: Target,
    badge: 'Leads',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bebas text-lg text-emerald-400">
            AG
          </div>
          <div>
            <h1 className="font-bebas text-lg leading-none tracking-wider text-white">Academia do Gol</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Escolinha de Futebol</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-[4px] bg-zinc-900 border border-zinc-800 text-zinc-300"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bebas text-2xl text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            ⚽
          </div>
          <div>
            <h2 className="font-bebas text-xl leading-none tracking-wider text-white">ACADEMIA DO GOL</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Gestão Escolinha
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Menu Principal
          </div>

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
                className={`flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.1)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase tracking-wider border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
          <div className="p-3 rounded-[4px] bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base Conectada</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Supabase: acadgolint</p>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 lg:hidden"
        />
      )}
    </>
  )
}
