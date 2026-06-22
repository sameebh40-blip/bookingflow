// One-off helper: apply a .sql file to the linked Supabase DB using the
// connection string the Supabase CLI already cached at supabase/.temp/pooler-url.
// Usage: node scripts/apply-sql.mjs supabase/migrations/<file>.sql
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const sqlPath = process.argv[2];
if (!sqlPath) { console.error('Usage: node scripts/apply-sql.mjs <file.sql>'); process.exit(1); }

const conn = readFileSync(new URL('../supabase/.temp/pooler-url', import.meta.url), 'utf8').trim();
const sql = readFileSync(sqlPath, 'utf8');

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

const run = async () => {
  await client.connect();
  console.log('Connected. Applying', sqlPath, '…');
  await client.query(sql);
  console.log('✅ Applied successfully.');
  await client.end();
};

run().catch(async (e) => {
  console.error('❌ Failed:', e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});
