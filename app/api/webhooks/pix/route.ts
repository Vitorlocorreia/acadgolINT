import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({error:'Baixa automática desativada. Os recebimentos são conferidos manualmente pela equipe.'},{status:410,headers:{'Cache-Control':'no-store'}}) }
