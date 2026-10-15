export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure as variáveis de conexão do Supabase.');
  return { url, key };
}
export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
 const timeout=AbortSignal.timeout(15000)
 return fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,timeout]):timeout})
}
