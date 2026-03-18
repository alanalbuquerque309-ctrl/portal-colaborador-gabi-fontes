import postgres from 'postgres';

const dbUrl = 'postgresql://postgres:Alan030813.@db.fxopbgjallrweshdehbn.supabase.co:5432/postgres';

async function test() {
  try {
    const sql = postgres(dbUrl, { max: 1, ssl: 'require' });
    await sql`SELECT 1`;
    console.log('Conexão OK');
    await sql.end();
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

test();
