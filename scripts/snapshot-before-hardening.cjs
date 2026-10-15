const fs = require('node:fs');
const crypto = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());
const tables = ['attendance_logs','canteen_products','canteen_sales','canteen_tab_items','canteen_tab_payments','canteen_tabs','categories','classes','coaches','enrollments','guardians','invoices','match_callups','matches','medical_records','plans','student_wallets','students','technical_evaluations','trial_classes','uniform_inventory','units','wallet_transactions'];
(async () => {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const snapshot = { project: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, createdAt: new Date().toISOString(), tables: {} };
  for (const table of tables) {
    const records = [];
    for (let start = 0;; start += 500) {
      const { data, error } = await client.from(table).select('*').range(start, start + 499);
      if (error) throw new Error(`Falha no snapshot de ${table}: ${error.message}`);
      records.push(...data);
      if (data.length < 500) break;
    }
    snapshot.tables[table] = records;
  }
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(snapshot));
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(cipher.getAuthTag());
  if (!Buffer.concat([decipher.update(encrypted), decipher.final()]).equals(plain)) throw new Error('Snapshot não validado.');
  fs.mkdirSync('.local-backups', { recursive: true });
  const base = '.local-backups/before-hardening-' + Date.now();
  fs.writeFileSync(base + '.key', key.toString('base64'), { mode: 0o600 });
  fs.writeFileSync(base + '.json.enc', JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), content: encrypted.toString('base64') }), { mode: 0o600 });
  console.log(JSON.stringify({ saved: base + '.json.enc', verified: true, tables: Object.fromEntries(Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])) }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
