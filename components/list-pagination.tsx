import Link from 'next/link'

interface Props{page:number;pages:number;total:number;pageSize:number;path:string;filters:Record<string,string|undefined>}
export function ListPagination({page,pages,total,pageSize,path,filters}:Props){
 const url=(next:number)=>{const params=new URLSearchParams();for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);params.set('page',String(next));return `${path}?${params}`}
 return <nav aria-label="Paginação da lista" className="surface p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--text-secondary)]">{total?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} de ${total}`:'Nenhum registro'} · Página {page} de {pages}</p><div className="flex gap-2">{page>1?<Link prefetch={false} className="button" href={url(page-1)}>Anterior</Link>:<span className="button opacity-40" aria-disabled="true">Anterior</span>}{page<pages?<Link prefetch={false} className="button" href={url(page+1)}>Próxima</Link>:<span className="button opacity-40" aria-disabled="true">Próxima</span>}</div></nav>
}
