import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicSupabaseConfig,fetchWithTimeout } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = publicSupabaseConfig();
  const db = createServerClient(url, key, { global:{fetch:fetchWithTimeout},cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(cookies, headers) {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value));
    },
  } });
  const path = request.nextUrl.pathname;
  const isPublic = path === '/login' || path === '/esqueci-senha' || path.startsWith('/auth/') || path.startsWith('/portal/') || path.startsWith('/convocacao/') || path.startsWith('/api/og/card/') || path === '/api/webhooks/pix' || path === '/api/health';
  const { data } = await db.auth.getClaims();
  if (!isPublic && !data?.claims) {
    const destination = new URL('/login', request.url);
    if (request.method === 'GET') destination.searchParams.set('next', path + request.nextUrl.search);
    const redirect = NextResponse.redirect(destination, request.method === 'GET' ? 307 : 303);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control','private, no-store');
    return redirect;
  }
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'] };
