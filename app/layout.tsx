import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/app-shell'
import { getStaffSession } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Escolinha do Sport | DNA Rubro-Negro • Sport Club do Recife',
  description: 'Formação de atletas, turmas, convocações, chamadas e gestão com a tradição e o DNA do Sport Club do Recife.',
  robots: { index: false, follow: false },
  icons: { icon: '/sport-recife.svg' },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getStaffSession()
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] antialiased">
        <ThemeProvider>
          <AppShell staff={session?.staff.active && session.staff.session_valid ? session.staff : null}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
