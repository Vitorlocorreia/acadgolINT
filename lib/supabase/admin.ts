import 'server-only'
import { requireStaff } from '@/lib/auth/session'
import type { Permission } from '@/lib/auth/permissions'

// All administrative access uses the verified user's session and database RLS.
// This client never uses a service-role key.
export async function createAdminClient(permission: Permission) {
  return (await requireStaff(permission)).db
}
