export function appUrl() {
 const raw=process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:'http://127.0.0.1:3000')
 return raw.replace(/\/$/,'')
}
