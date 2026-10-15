import { defineConfig, globalIgnores } from 'eslint/config'
import next from 'eslint-config-next'
export default defineConfig([
 ...next,
 globalIgnores(['.local-credentials/**','.local-backups/**','artifacts/**','supabase/functions/**']),
])
