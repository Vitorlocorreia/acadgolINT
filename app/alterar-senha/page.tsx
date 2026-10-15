import { AuthLayout } from '@/components/auth-layout'
import { requireStaff } from '@/lib/auth/session'
import { PasswordForm } from './password-form'

export default async function ChangePasswordPage() {
  const { staff } = await requireStaff(undefined, true)
  return <AuthLayout title={staff.must_change_password ? 'Crie sua senha pessoal' : 'Alterar senha'} description={staff.must_change_password ? 'Antes de continuar, substitua a senha temporária por uma senha que só você conhece.' : 'Escolha uma nova senha para proteger seu acesso.'}><PasswordForm /></AuthLayout>
}
