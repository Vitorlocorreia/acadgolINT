import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/auth-layout'
import { getStaffSession } from '@/lib/auth/session'
import { homeForRole } from '@/lib/auth/permissions'
import { LoginForm } from './login-form'

export const metadata = { title: 'Entrar | Escolinha do Sport — Sport', robots: { index: false, follow: false } }
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const context = await getStaffSession()
  if (context?.staff.active && context.staff.session_valid) redirect(context.staff.must_change_password ? '/alterar-senha' : homeForRole(context.staff.role))
  const params = await searchParams
  return <AuthLayout title="Bem-vindo de volta" description="Entre para acompanhar a rotina da escolinha."><LoginForm next={params.next} expired={params.reason === 'expired'} /></AuthLayout>
}
