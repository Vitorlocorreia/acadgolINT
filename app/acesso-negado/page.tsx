import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { homeForRole } from '@/lib/auth/permissions'
import { ShieldAlert } from 'lucide-react'

export default async function AccessDeniedPage() {
  const { staff } = await requireStaff()
  return <div className="page-container"><section className="surface empty-state !py-20"><ShieldAlert size={40} /><h1 className="page-title mb-4">Acesso restrito</h1><p>Seu perfil não tem acesso a esta área. Se precisar, procure o administrador da escolinha.</p><Link className="button button-primary" href={homeForRole(staff.role)}>Voltar para minha área</Link></section></div>
}
