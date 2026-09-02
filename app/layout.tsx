import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'Academia do Gol | Gestão da Escolinha de Futebol',
  description: 'Sistema completo de administração interna, turmas, chamadas, mensalidades e scout de atletas da Academia do Gol.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row antialiased">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto min-h-screen bg-slate-50/50">
          {children}
        </main>
      </body>
    </html>
  )
}
