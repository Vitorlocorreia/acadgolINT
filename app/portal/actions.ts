'use server'
import { familyAccess } from '@/lib/supabase/family'
import type { PortalData } from './[token]/portal-client'
export async function getStudentPortalData(token:string):Promise<PortalData|null>{return familyAccess('portal',token)}
