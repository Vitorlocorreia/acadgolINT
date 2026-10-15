import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { homeForRole } from '@/lib/auth/permissions'
export default async function RootPage() { const {staff}=await requireStaff(); redirect(homeForRole(staff.role)) }
