import Link from 'next/link'
import { AuthLayout } from '@/components/auth-layout'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function PasswordHelpPage() {
  return <AuthLayout title="Recuperar acesso" description="O administrador da escolinha pode gerar uma nova senha temporária para sua conta."><div className="notice"><ShieldCheck size={22} className="shrink-0" /><p>Procure o administrador e confirme sua identidade. No próximo acesso, você criará uma nova senha pessoal.</p></div><Link className="button w-full mt-6" href="/login"><ArrowLeft size={18} />Voltar para entrar</Link></AuthLayout>
}
