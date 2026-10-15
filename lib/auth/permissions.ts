export const roles = ['admin', 'secretaria', 'financeiro', 'treinador'] as const;
export type StaffRole = typeof roles[number];
export const roleLabels: Record<StaffRole, string> = { admin: 'Administrador', secretaria: 'Secretaria', financeiro: 'Financeiro', treinador: 'Treinador' };
export type Permission = 'dashboard.read' | 'students.read' | 'students.write' | 'plans.read' | 'plans.write' | 'classes.read' | 'classes.write' | 'attendance.read' | 'attendance.write' | 'games.read' | 'games.write' | 'finance.read' | 'finance.write' | 'finance.reverse' | 'trials.read' | 'trials.write' | 'inventory.read' | 'inventory.write' | 'communications.manage' | 'staff.manage' | 'staff.coaches.manage';
const permissions: Record<StaffRole, readonly Permission[]> = {
  admin: ['dashboard.read','students.read','students.write','plans.read','plans.write','classes.read','classes.write','attendance.read','attendance.write','games.read','games.write','finance.read','finance.write','finance.reverse','trials.read','trials.write','inventory.read','inventory.write','communications.manage','staff.manage','staff.coaches.manage'],
  secretaria: ['dashboard.read','students.read','students.write','plans.read','plans.write','classes.read','classes.write','attendance.read','attendance.write','games.read','games.write','finance.read','finance.write','finance.reverse','trials.read','trials.write','inventory.read','inventory.write','communications.manage','staff.coaches.manage'],
  financeiro: ['finance.read','finance.write','finance.reverse'],
  treinador: ['classes.read','attendance.read','attendance.write','games.read','games.write'],
};
export function hasPermission(role: StaffRole | string, permission: Permission) { return roles.includes(role as StaffRole) && permissions[role as StaffRole].includes(permission); }
export function homeForRole(role: StaffRole) { return role === 'treinador' ? '/chamada' : role === 'financeiro' ? '/financeiro' : '/dashboard'; }
export function permissionForPath(path: string): Permission | null {
  const entries: [string, Permission][] = [['/dashboard','dashboard.read'],['/alunos/novo','students.write'],['/alunos','students.read'],['/planos','plans.read'],['/turmas','classes.read'],['/chamada','attendance.read'],['/jogos','games.read'],['/financeiro','finance.read'],['/experimentais','trials.read'],['/uniformes','inventory.read'],['/whatsapp','communications.manage'],['/equipe','staff.coaches.manage']];
  return entries.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'))?.[1] || null;
}
export function safeNextPath(value: unknown) { return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/[\u0000-\u001f]/.test(value) ? value : null; }
