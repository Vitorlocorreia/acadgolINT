"use client";

import { useEffect, useSyncExternalStore, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  Target,
  Trophy,
  Shirt,
  MessagesSquare,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  UserCircle,
  LogOut,
  KeyRound,
  NotebookPen,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { hasPermission, permissionForPath, homeForRole, roleLabels, type StaffRole } from '@/lib/auth/permissions';
import { logoutAction } from '@/app/login/actions';

const groups = [
  {
    label: "Dia a dia",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/alunos", label: "Atletas", icon: Users },
      { href: "/turmas", label: "Turmas e horários", icon: CalendarDays },
      { href: "/chamada", label: "Chamada", icon: ClipboardCheck },
      { href: "/jogos", label: "Jogos e convocações", icon: Trophy },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/planos", label: "Planos de matrícula", icon: NotebookPen },
      { href: "/experimentais", label: "Aulas experimentais", icon: Target },
      { href: "/uniformes", label: "Uniformes", icon: Shirt },
      { href: "/whatsapp", label: "Comunicação", icon: MessagesSquare },
      { href: "/equipe", label: "Equipe e acessos", icon: ShieldCheck },
    ],
  },
];

export function AppShell({ children, staff }: { children: ReactNode; staff: {full_name: string; email: string; role: StaffRole} | null }) {
  const pathname = usePathname();
  const storedCollapsed=useSyncExternalStore((listener)=>{window.addEventListener('storage',listener);return ()=>window.removeEventListener('storage',listener)},()=>{try{return localStorage.getItem('acadgol_sidebar_collapsed')==='true'}catch{return false}},()=>false);
  const [collapsedOverride,setCollapsed]=useState<boolean|null>(null);
  const collapsed=collapsedOverride??storedCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const isPublic =
    pathname.startsWith("/portal") || pathname.startsWith("/convocacao") || ['/login','/esqueci-senha','/alterar-senha'].includes(pathname);
  const home = staff ? homeForRole(staff.role) : '/login';
  const visibleGroups = groups.map(group => ({...group,items: group.items.filter(item => staff && hasPermission(staff.role,permissionForPath(item.href)!))})).filter(group=>group.items.length);
  const current = groups
    .flatMap((group) => group.items)
    .find((item) => pathname.startsWith(item.href));

  useEffect(() => {
    if (mobileOpen && !drawer.current?.open) drawer.current?.showModal();
    if (!mobileOpen && drawer.current?.open) drawer.current.close();
  }, [mobileOpen]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("acadgol_sidebar_collapsed", String(next));
    } catch {
      /* Continue without persistence. */
    }
  };
  const navigation = (compact: boolean) => (
    <>
      <Link
        href={home}
        className="sidebar-brand"
        aria-label="Sport Club do Recife — início"
        onClick={() => setMobileOpen(false)}
      >
        <Image
          src="/sport-recife.svg"
          alt=""
          width={38}
          height={48}
          priority
          className="shrink-0"
        />
        {!compact && (
          <div>
            <div className="font-bebas text-[27px] leading-none tracking-wide">
              SPORT
            </div>
            <div className="mt-1 text-xs text-[#aab4c6]">
              Gestão da escolinha
            </div>
          </div>
        )}
      </Link>
      <nav
        aria-label="Navegação principal"
        className="flex-1 overflow-y-auto px-3 pb-6"
      >
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!compact && <p className="nav-group-title">{group.label}</p>}
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="nav-item"
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                aria-label={compact ? label : undefined}
                title={compact ? label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                {!compact && <span>{label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mx-5 border-t border-white/10 py-5">
        {compact ? (
          <Image src="/sport-recife.svg" alt="Escudo do Sport Club do Recife" width={30} height={40} />
        ) : (
          <div className="flex items-center gap-3">
            <Image
              src="/sport-recife.svg"
              alt=""
              width={30}
              height={40}
              className="shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-[#dce1ea]">
                Escolinha do Sport
              </p>
              <p className="mt-0.5 text-[11px] text-[#96a2b7]">
                Formando novos leões.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (isPublic) return <>{children}</>;

  return (
    <div className="min-h-screen lg:flex">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <aside
        className={`sidebar app-chrome hidden lg:flex ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        {navigation(collapsed)}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="app-topbar app-chrome">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="icon-button lg:hidden"
              aria-label="Abrir navegação"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              className="icon-button hidden lg:inline-flex"
              aria-label={
                collapsed ? "Expandir navegação" : "Recolher navegação"
              }
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
            <Image
              src="/sport-recife.svg"
              alt="Sport"
              width={26}
              height={33}
              className="shrink-0 lg:hidden"
            />
            <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Gestão da escolinha</span>
              <ChevronRight
                size={14}
                className="hidden sm:block"
                aria-hidden="true"
              />
              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {current?.label || "Ficha do atleta"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--text-secondary)] sm:block">
              Sport Club do Recife
            </span>
            <ThemeToggle />
            {staff && <details className="user-menu"><summary className="button !px-2 sm:!px-3"><UserCircle size={18}/><span className="hidden sm:inline">{staff.full_name.split(' ')[0]}</span><span className="sr-only">Minha conta</span></summary><div className="user-menu-panel"><strong className="block text-sm">{staff.full_name}</strong><span className="block text-xs text-[var(--text-muted)] mt-1 mb-4">{roleLabels[staff.role]}</span><Link href="/alterar-senha" className="button button-quiet w-full !justify-start"><KeyRound size={16}/>Alterar senha</Link><form action={logoutAction}><button className="button button-quiet w-full !justify-start"><LogOut size={16}/>Sair da conta</button></form></div></details>}
          </div>
        </header>
        <main
          id="conteudo"
          tabIndex={-1}
          className="app-main min-w-0 outline-none"
        >
          {children}
        </main>
        <footer className="app-chrome mx-4 flex items-center justify-between gap-4 border-t border-[var(--border-color)] py-5 text-xs text-[var(--text-muted)] sm:mx-8">
          <span>
            Sport Club do Recife{" "}
            <span className="hidden sm:inline">· Escolinha do Sport</span>
          </span>
          <Link
            href={staff && hasPermission(staff.role,'attendance.read') ? '/chamada' : home}
            className="flex items-center gap-1 hover:text-[var(--brand)]"
          >
            {staff && hasPermission(staff.role,'attendance.read') ? 'Ir para a chamada' : 'Minha área'} <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
      <dialog
        ref={drawer}
        className="mobile-drawer app-chrome"
        aria-label="Navegação da escolinha"
        onCancel={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false);
        }}
      >
        <div className="sidebar">
          <button
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-[#c0cada] hover:bg-white/10"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
          {navigation(false)}
        </div>
      </dialog>
    </div>
  );
}
