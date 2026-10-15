'use client'
import type { ReactNode } from 'react'
import { ThemeProvider as Provider, useTheme as useNextTheme } from 'next-themes'
export function ThemeProvider({children}:{children:ReactNode}) {
 return <Provider attribute="class" storageKey="acadgol_theme" defaultTheme="system" enableSystem>{children}</Provider>
}
export function useTheme(){
 const {resolvedTheme,setTheme}=useNextTheme()
 const theme=resolvedTheme==='dark'?'dark':'light'
 return {theme,setTheme,toggleTheme:()=>setTheme(theme==='dark'?'light':'dark')}
}
