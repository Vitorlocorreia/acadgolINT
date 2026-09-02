'use client'

import Link from 'next/link'
import Image from 'next/image'
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
    badgeColor: 'bg-[#C8E6C9] text-[#0D4A1C] border-[#1A6B2E]/20',
  },
  {
    href: '/financeiro',
    label: 'Mensalidades & PIX',
    icon: DollarSign,
  },
  {
    href: '/avaliacoes',
    label: 'Boletim do Atleta',
    icon: Award,
  },
  {
    href: '/experimentais',
    label: 'Aulas Experimentais',
    icon: Target,
    badge: 'Leads',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 shrink-0">
            <Image
              src="/logo.png"
              alt="Academia do Gol"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="font-bebas text-xl leading-none tracking-wider text-[#1A6B2E]">Academia do Gol</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#0D4A1C]">Escolinha de Futebol</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-[4px] bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 shadow-xs ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3.5 bg-gradient-to-b from-[#1A6B2E]/5 to-transparent">
          <div className="relative w-12 h-12 shrink-0 drop-shadow-xs">
            <Image
              src="/logo.png"
              alt="Logo Academia do Gol"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="font-bebas text-2xl leading-none tracking-wider text-[#1A6B2E]">ACADEMIA DO GOL</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#1A6B2E]"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#0D4A1C]">
                Gestão Escolinha
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1A6B2E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0D4A1C] hover:bg-[#1A6B2E]/8 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 rounded-[4px] bg-white border border-slate-200 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A6B2E]" />
              <span>Base Oficial</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Supabase: acadgolint</p>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}
    </>
  )
}
