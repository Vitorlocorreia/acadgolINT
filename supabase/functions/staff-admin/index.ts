import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, serviceKey, { global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})},auth: { persistSession: false, autoRefreshToken: false } });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(v => v.toString(16).padStart(2, '0')).join('');
function randomIndex(max: number) {
  const value=new Uint32Array(1),limit=Math.floor(0x100000000/max)*max;
  do {crypto.getRandomValues(value);} while(value[0]>=limit);
  return value[0]%max;
}
function temporaryPassword() {
  const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%'];
  const alphabet=groups.join(''),chars=groups.map(group=>group[randomIndex(group.length)]);
  while(chars.length<8)chars.push(alphabet[randomIndex(alphabet.length)]);
  for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
  return chars.join('');
}
function validPerson(data: any) { return typeof data.username === 'string' && /^[a-z0-9][a-z0-9._-]{2,39}$/.test(data.username) && typeof data.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && data.email.length <= 254 && typeof data.full_name === 'string' && data.full_name.trim().length >= 2 && data.full_name.length <= 120 && ['admin','secretaria','financeiro','treinador'].includes(data.role) && (data.role !== 'treinador' || data.create_coach===true || (typeof data.coach_id === 'string' && /^[0-9a-f-]{36}$/i.test(data.coach_id))); }

Deno.serve(async req => {
  if (req.method !== 'POST') return response({ error: 'Método não permitido.' }, 405);
  if (Number(req.headers.get('content-length') || 0) > 12000) return response({ error: 'Solicitação inválida.' }, 413);
  try {
    const raw = await req.text();
    if (raw.length > 12000) return response({ error: 'Solicitação inválida.' }, 413);
    const body = JSON.parse(raw);
    if (body.action === 'login') {
      const identifier = String(body.identifier || '').trim().toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (identifier.length < 3 || identifier.length > 254 || !password || password.length > 128) return response({ error: 'Confira usuário e senha.' },400);
      const address = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
      for (const [bucket,limit] of [[`login:user:${await digest(identifier)}`,10],[`login:ip:${await digest(address)}`,100]] as const) {
        const allowed = await admin.rpc('consume_request_limit',{p_bucket:bucket,p_limit:limit,p_seconds:900});
        if (allowed.error || !allowed.data) return response({error:'Muitas tentativas. Aguarde 15 minutos para tentar novamente.'},429);
      }
      const lookup = await admin.from('staff_profiles').select('id,active').eq(identifier.includes('@')?'email':'username',identifier).maybeSingle();
      // Staff login aliases can change without replacing the Auth identity or its password.
      // The technical Auth email is resolved only here, with the server-side admin client.
      const identity = lookup.data?.id ? await admin.auth.admin.getUserById(lookup.data.id) : null;
      const viewer = createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
      const result = await viewer.auth.signInWithPassword({email:identity?.data?.user?.email || 'inexistente@accounts.acadgol.invalid',password});
      if (!lookup.data?.active || result.error || !result.data.session) return response({error:'Não foi possível entrar. Confira usuário e senha.'},401);
      return response({access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token});
    }
    let actor: any = null;
    let bootstrap = false;
    let bootstrapSetting: any = null;
    if (body.action === 'bootstrap') {
      const token = req.headers.get('x-bootstrap-token') || '';
      if (token.length < 32 || token.length > 128) return response({ error: 'Inicialização não autorizada.' }, 403);
      const hash = await digest(token);
      const { data: setting } = await admin.from('app_settings').select('value').eq('key','staff_bootstrap').maybeSingle();
      if (!setting || setting.value.hash !== hash || setting.value.used || new Date(setting.value.expires_at) < new Date()) return response({ error: 'Inicialização não autorizada.' }, 403);
      const claimed = await admin.rpc('claim_staff_bootstrap', { p_hash: hash });
      if (claimed.error || !claimed.data) return response({ error: 'Inicialização indisponível.' }, 409);
      bootstrapSetting = setting.value;
      bootstrap = true;
      body.role = 'admin';
      if (body.is_test && !setting.value.test_mode) return response({ error: 'Modo de verificação indisponível.' }, 403);
    } else {
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (error || !user) return response({ error: 'Sessão inválida.' }, 401);
      const viewer = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
      const profile = await viewer.rpc('current_staff_profile');
      if (profile.error || !profile.data?.active || !profile.data?.session_valid || profile.data.must_change_password || !['admin','secretaria'].includes(profile.data.role)) return response({ error: 'Acesso não autorizado para gerenciar a equipe.' }, 403);
      actor = profile.data;
    }

    if (bootstrap || body.action === 'create') {
      if (actor?.role==='secretaria' && body.role!=='treinador') return response({error:'A secretaria pode criar apenas acessos de treinadores.'},403);
      body.username = String(body.username || '').trim().toLowerCase();
      body.email = String(body.email || `${body.username}@accounts.acadgol.invalid`).trim().toLowerCase();
      if (!validPerson(body)) {
        if (bootstrap) await admin.from('app_settings').update({ value: { ...bootstrapSetting, used: false } }).eq('key','staff_bootstrap');
        return response({ error: 'Revise nome, e-mail, perfil e treinador vinculado.' }, 400);
      }
      const password = temporaryPassword();
      const { data, error } = await admin.auth.admin.createUser({ email: body.email.trim().toLowerCase(), password, email_confirm: true, app_metadata: { managed_staff: true } });
      if (error || !data.user) {
        if (bootstrap) await admin.from('app_settings').update({ value: { ...bootstrapSetting, used: false } }).eq('key','staff_bootstrap');
        return response({ error: 'Não foi possível criar o acesso. Confira se o e-mail já está cadastrado.' }, 409);
      }
      const profileData={ id: data.user.id, username: body.username, full_name: body.full_name.trim(), email: body.email, role: body.role, coach_id: body.role === 'treinador' ? body.coach_id : null, active: true, must_change_password: true, is_test: bootstrap && body.is_test === true, created_by: actor?.id || data.user.id };
      const inserted = body.role==='treinador' && body.create_coach===true
        ? await admin.rpc('create_coach_access_profile',{p_staff:profileData})
        : await admin.from('staff_profiles').insert(profileData);
      if (inserted.error) {
        await admin.auth.admin.deleteUser(data.user.id);
        if (bootstrap) await admin.from('app_settings').update({ value: { ...bootstrapSetting, used: false } }).eq('key','staff_bootstrap');
        return response({ error: 'O acesso não foi concluído. Revise o perfil e tente novamente.' }, 400);
      }
      if (bootstrap && !body.is_test) await admin.from('app_settings').update({ value: { ...bootstrapSetting, used: true, test_mode: false } }).eq('key','staff_bootstrap');
      return response({ success: true, id: data.user.id, temporaryPassword: password, username: body.username, email: body.email, mustChangePassword: true });
    }

    const { data: target, error: targetError } = await admin.from('staff_profiles').select('*').eq('id',body.user_id).maybeSingle();
    if (targetError || !target) return response({ error: 'Acesso não encontrado.' }, 404);
    if (actor.role==='secretaria' && (target.role!=='treinador' || (body.action==='update' && body.role!=='treinador'))) return response({error:'A secretaria pode gerenciar apenas acessos de treinadores.'},403);
    if (body.action === 'cleanup_test') {
      if (!target.is_test || target.id !== actor.id) return response({ error: 'Operação indisponível.' }, 403);
      const removed = await admin.auth.admin.deleteUser(target.id);
      if (removed.error) return response({ error: 'Não foi possível remover a conta de verificação.' }, 400);
      const { count } = await admin.from('staff_profiles').select('id',{count:'exact',head:true}).eq('role','admin').eq('active',true);
      if (!count) { const config = await admin.from('app_settings').select('value').eq('key','staff_bootstrap').single(); if (config.data) await admin.from('app_settings').update({value:{...config.data.value,used:false}}).eq('key','staff_bootstrap'); }
      return response({ success: true });
    }
    if (body.action === 'reset_password') {
      if (target.id === actor.id) return response({ error: 'Use a opção Alterar senha para sua própria conta.' }, 400);
      const stamp = new Date().toISOString();
      let lock=admin.from('staff_profiles').update({ must_change_password:true, sessions_valid_after:stamp,credential_reset_until:new Date(Date.now()+120000).toISOString(),updated_by:actor.id }).eq('id',target.id).or(`credential_reset_until.is.null,credential_reset_until.lt.${stamp}`);
      if(actor.role==='secretaria')lock=lock.eq('role','treinador');
      const blocked=await lock.select('id').maybeSingle();
      if (blocked.error || !blocked.data) return response({ error: 'Este acesso está sendo alterado. Atualize a página e tente novamente.' }, 409);
      const password = temporaryPassword();
      const changed = await admin.auth.admin.updateUserById(target.id,{ password });
      if (changed.error) {
        await admin.from('staff_profiles').update({credential_reset_until:null}).eq('id',target.id);
        return response({ error: 'A senha não foi redefinida. Tente novamente.' },400);
      }
      const completed = await admin.from('staff_profiles').update({ must_change_password:true,credential_reset_until:null,updated_by:actor.id }).eq('id',target.id);
      if (completed.error) return response({ error: 'A redefinição não foi concluída. Tente novamente.' },400);
      return response({success:true,temporaryPassword:password,username:target.username,email:target.email,mustChangePassword:true});
    }
    if (body.action === 'update') {
      if (!['admin','secretaria','financeiro','treinador'].includes(body.role) || typeof body.active !== 'boolean' || (body.role === 'treinador' && !body.coach_id)) return response({ error: 'Perfil inválido.' },400);
      if (target.id === actor.id && (!body.active || body.role !== 'admin')) return response({ error: 'Outro administrador deve alterar seu perfil.' },400);
      const changed = await admin.from('staff_profiles').update({role:body.role,active:body.active,coach_id:body.role==='treinador'?body.coach_id:null,sessions_valid_after:new Date().toISOString(),updated_by:actor.id}).eq('id',target.id).eq('role',target.role).select('id').maybeSingle();
      if (changed.error || !changed.data) return response({ error: 'Não foi possível alterar o acesso. Confira se há uma redefinição em andamento e mantenha pelo menos um administrador ativo.' },400);
      return response({success:true});
    }
    return response({ error: 'Operação desconhecida.' },400);
  } catch { return response({ error: 'Não foi possível concluir a solicitação.' },500); }
});
