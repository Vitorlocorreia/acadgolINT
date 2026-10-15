import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return <div className="page-container"><section className="surface empty-state !py-20"><SearchX size={42} /><p className="eyebrow !mb-3">Vamos encontrar o caminho</p><h1 className="page-title mb-3">Página não encontrada</h1><p>O endereço pode estar incompleto ou o registro não está mais disponível. Se recebeu um link da escolinha, peça um novo acesso à coordenação.</p><Link href="/dashboard" className="button"><ArrowLeft size={18} />Ir para o início</Link></section></div>
}
