'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, Loader2, KeyRound, ShieldCheck, Users } from 'lucide-react'
import { Dialog } from '@/components/dialog'
import { roles, roleLabels, type StaffRole } from '@/lib/auth/permissions'
import { createStaffAction, updateStaffAction, resetStaffPasswordAction } from './actions'
interface Person { id: string; full_name: string; username: string; email: string; role: string; coach_id: string | null; active: boolean; must_change_password: boolean }
export function TeamClient({ people, coaches, viewer, viewerRole }: { people: Person[]; coaches: { id: string; name: string }[]; viewer: string; viewerRole:StaffRole }) {
  const router = useRouter()
  const [open,setOpen]=useState(false), [pending,start]=useTransition(), [role,setRole]=useState<StaffRole>(viewerRole==='secretaria'?'treinador':'secretaria')
  const [feedback,setFeedback]=useState(''), [credential,setCredential]=useState<{username:string;password:string}|null>(null)
  const [editing,setEditing]=useState<Person|null>(null), [reset,setReset]=useState<Person|null>(null)
  const descriptions: Record<StaffRole,string>={admin:'Todos os módulos e gerenciamento da equipe.',secretaria:'Todos os módulos operacionais, financeiro e gestão de acessos dos treinadores.',financeiro:'Mensalidades, recebimentos, estornos e relatórios.',treinador:'Turmas vinculadas, chamada e jogos da sua equipe.'}
  async function showResult(result:any) { if(result.error) setFeedback(result.error); else { if(result.selfUpdated){router.replace('/login?reason=access_updated');router.refresh();return} setFeedback('Acesso atualizado.'); if(result.temporaryPassword)setCredential({username:result.email&&!result.email.endsWith('@accounts.acadgol.invalid')?result.email:result.username,password:result.temporaryPassword}); setOpen(false); setEditing(null); setReset(null) } }
  function submitAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const identity = { username:String(form.get('username')).trim().toLowerCase(), email:String(form.get('email')).trim().toLowerCase() }
    start(async()=>{
      setFeedback('')
      try {
        await showResult(editing
          ? await updateStaffAction({user_id:editing.id,...identity,role,coach_id:role==='treinador'?String(form.get('coach_id')):null,active:editing.id===viewer?editing.active:form.get('active')==='true'})
          : await createStaffAction({full_name:String(form.get('full_name')),...identity,role,coach_id:role==='treinador'&&form.get('coach_id')!=='new'?String(form.get('coach_id')):null,create_coach:role==='treinador'&&form.get('coach_id')==='new'}))
      } catch { setFeedback('Não foi possível atualizar o acesso. Tente novamente.') }
    })
  }
  return <>
    {feedback && <p role="status" className="notice">{feedback}</p>}
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-[var(--text-secondary)]">{people.length} acesso(s) da equipe</p><button className="button button-primary" onClick={()=>{setRole(viewerRole==='secretaria'?'treinador':'secretaria');setFeedback('');setOpen(true)}}><Plus size={18}/>Novo acesso</button></div>
    <div className="surface overflow-hidden">{people.length===0?<div className="empty-state"><Users size={36}/><strong>Nenhuma conta da equipe cadastrada</strong><p>Crie os acessos das pessoas que vão operar a escolinha.</p></div>:<div className="table-responsive"><table className="data-table mobile-data-table"><thead><tr><th>Pessoa</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{people.map(person=><tr key={person.id}><td data-label="Pessoa"><strong>{person.full_name}</strong><p className="text-xs text-[var(--text-muted)] mt-1">Usuário: {person.username}</p>{!person.email.endsWith('@accounts.acadgol.invalid')&&<p className="text-xs text-[var(--text-muted)] mt-1 break-all">{person.email}</p>}</td><td data-label="Perfil">{roleLabels[person.role as StaffRole]}</td><td data-label="Situação"><span className={`badge ${person.active?'badge-success':'badge-danger'}`}>{person.active?'Ativo':'Bloqueado'}</span>{person.must_change_password&&<p className="text-xs text-[var(--text-muted)] mt-1">Troca de senha pendente</p>}</td><td data-label="Ações"><div className="flex flex-wrap gap-2"><button className="button" disabled={pending} onClick={()=>{setFeedback('');setEditing(person);setRole(person.role as StaffRole)}}>Editar acesso</button><button className="icon-button" aria-label={`Redefinir senha de ${person.full_name}`} title="Redefinir senha" disabled={pending||person.id===viewer} onClick={()=>setReset(person)}><KeyRound size={18}/></button></div></td></tr>)}</tbody></table></div>}</div>
    <Dialog open={open||!!editing} onClose={()=>{if(!pending){setOpen(false);setEditing(null)}}} title={editing?'Editar acesso':'Criar acesso'} description="Defina o que cada pessoa pode acessar.">
      <form key={editing?.id||'new'} className="space-y-5" onSubmit={submitAccess}>
        {feedback&&<p role="alert" className="notice notice-error">{feedback}</p>}
        {!editing?<div><label htmlFor="staff-name" className="field-label">Nome completo</label><input id="staff-name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="field"/></div>:<p className="text-sm font-semibold">{editing.full_name}</p>}
        <div><label htmlFor="staff-username" className="field-label">Usuário</label><input id="staff-username" name="username" defaultValue={editing?.username||''} required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9._-]{2,39}" autoCapitalize="none" autoComplete="off" spellCheck={false} className="field"/><p className="text-xs text-[var(--text-muted)] mt-2">Use letras minúsculas, números, ponto, traço ou sublinhado.</p></div>
        <div><label htmlFor="staff-email" className="field-label">E-mail (opcional)</label><input id="staff-email" name="email" type="email" defaultValue={editing&&!editing.email.endsWith('@accounts.acadgol.invalid')?editing.email:''} autoComplete="off" maxLength={254} className="field"/><p className="text-xs text-[var(--text-muted)] mt-2">Você pode entrar com o usuário ou com o e-mail informado.</p></div>
        <div><label htmlFor="staff-role" className="field-label">Perfil</label><select id="staff-role" value={role} disabled={editing?.id===viewer} onChange={event=>setRole(event.target.value as StaffRole)} className="field">{(viewerRole==='secretaria'?['treinador'] as StaffRole[]:roles).map(value=><option key={value} value={value}>{roleLabels[value]}</option>)}</select><p className="text-xs text-[var(--text-muted)] mt-2">{descriptions[role]}</p></div>
        {role==='treinador'&&<div><label htmlFor="staff-coach" className="field-label">Treinador vinculado</label><select id="staff-coach" name="coach_id" defaultValue={editing?.coach_id||'new'} required className="field">{!editing&&<option value="new">Cadastrar novo treinador com este nome</option>}<option value="">Selecione um cadastro existente</option>{coaches.map(coach=><option key={coach.id} value={coach.id}>{coach.name}</option>)}</select></div>}
        {editing&&<div><label htmlFor="staff-active" className="field-label">Situação do acesso</label><select id="staff-active" name="active" defaultValue={String(editing.active)} disabled={editing.id===viewer} className="field"><option value="true">Ativo</option><option value="false">Bloqueado</option></select><p className="text-xs text-[var(--text-muted)] mt-2">Após salvar, entre novamente com o usuário ou e-mail atualizado. A senha será mantida.</p>{editing.id===viewer&&<p className="text-xs text-[var(--text-muted)] mt-2">Outro administrador pode alterar seu perfil ou bloquear seu acesso.</p>}</div>}
        <button className="button button-primary w-full" disabled={pending}>{pending?<Loader2 size={18} className="animate-spin"/>:<ShieldCheck size={18}/>} {editing?'Salvar acesso':'Criar acesso'}</button>
      </form>
    </Dialog>
    <Dialog open={!!reset} onClose={()=>!pending&&setReset(null)} title="Redefinir senha?" description={`As sessões de ${reset?.full_name||''} serão encerradas. A pessoa precisará entrar com a senha temporária e criar uma nova senha.`}>
      {feedback&&<p role="status" className="notice">{feedback}</p>}<div className="flex justify-end flex-wrap gap-2"><button className="button" onClick={()=>setReset(null)} disabled={pending}>Cancelar</button><button className="button button-primary" disabled={pending} onClick={()=>start(async()=>{try{await showResult(await resetStaffPasswordAction(reset!.id))}catch{setFeedback('Não foi possível redefinir a senha. Tente novamente.')}})}>Gerar senha temporária</button></div>
    </Dialog>
    <Dialog open={!!credential} onClose={()=>setCredential(null)} title="Acesso preparado" description="Copie a senha temporária e entregue diretamente à pessoa. Ela será obrigada a criar uma nova senha no primeiro acesso.">
      <p className="text-sm font-semibold break-all">{credential?.username}</p><code className="block p-4 rounded-lg bg-[var(--bg-subtle)] break-all select-all text-sm">{credential?.password}</code><p className="text-xs text-[var(--text-muted)]">Esta senha não ficará disponível para consulta após fechar esta janela.</p><div className="flex justify-end gap-2"><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(credential!.password);setFeedback('Senha temporária copiada.')}catch{setFeedback('Selecione e copie a senha exibida.')}}}><Copy size={16}/>Copiar senha</button><button className="button button-primary" onClick={()=>setCredential(null)}>Concluir</button></div>
    </Dialog>
  </>
}
