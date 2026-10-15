import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission, type Permission, type StaffRole } from './permissions';

export interface StaffProfile { id: string; full_name: string; username: string; email: string; role: StaffRole; coach_id: string | null; active: boolean; must_change_password: boolean; session_valid: boolean; }
export const getStaffSession = cache(async () => {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const result = await db.rpc('current_staff_profile');
  if (result.error || !result.data) return null;
  return { db, user, staff: result.data as StaffProfile };
});

export async function requireStaff(permission?: Permission, allowPasswordChange = false) {
  const context = await getStaffSession();
  if (!context || !context.staff.active || !context.staff.session_valid) redirect('/login?reason=expired');
  if (context.staff.must_change_password && !allowPasswordChange) redirect('/alterar-senha');
  if (permission && !hasPermission(context.staff.role, permission)) throw new Error('Seu perfil não tem permissão para realizar esta ação.');
  return context;
}

export async function requirePage(permission: Permission) {
  const context = await requireStaff()
  if (!hasPermission(context.staff.role, permission)) redirect('/acesso-negado')
  return context
}
