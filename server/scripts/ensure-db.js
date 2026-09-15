const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const databaseTargets = [];
  if (process.env.NODE_ENV === 'test') {
    if (process.env.TEST_DATABASE_URL) databaseTargets.push(process.env.TEST_DATABASE_URL);
  }
  if (process.env.DATABASE_URL) databaseTargets.push(process.env.DATABASE_URL);
  if (databaseTargets.length === 0) {
    throw new Error('DATABASE_URL or TEST_DATABASE_URL is required');
  }

  const uniqueTargets = [...new Set(databaseTargets)];
  for (const targetUrl of uniqueTargets) {
    const parsed = new URL(targetUrl);
    const dbName = parsed.pathname.replace(/^\//, '');
    const adminUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.host}/postgres`;

    const adminClient = new Client({ connectionString: adminUrl });
    await adminClient.connect();

    const exists = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database: ${dbName}`);
    } else {
      console.log(`Database exists: ${dbName}`);
    }

    await adminClient.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
