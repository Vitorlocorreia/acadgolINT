'use client'
import {Printer} from 'lucide-react'
export function CashPrintButton(){return <button type="button" className="button button-primary screen-only" onClick={()=>window.print()}><Printer size={16}/>Imprimir ou salvar PDF</button>}
